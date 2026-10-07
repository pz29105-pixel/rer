import type { EngineInterface, Register } from 'claude-code'
import { scanSecurity } from './scan.ts'

type Report = { path: string; errors: string[]; security: string[] }

// Führt ein Prüfwerkzeug aus; null, wenn es nicht installiert ist oder nicht startet.
async function run($: EngineInterface, argv: string[]) {
  try {
    return await $.process.run(argv, { timeoutMs: 20_000 })
  } catch {
    return null
  }
}

function output(r: { stdout: string; stderr: string }) {
  return (r.stdout + '\n' + r.stderr).trim().split('\n').slice(0, 30).join('\n')
}

async function checkFile($: EngineInterface, path: string, text?: string): Promise<Report> {
  const report: Report = { path, errors: [], security: [] }
  if (text === undefined) {
    try {
      text = await $.fs.read(path)
    } catch {
      return report
    }
  }

  if (/\.py$/i.test(path)) {
    const compiled = await run($, ['python3', '-m', 'py_compile', path])
    if (compiled && compiled.exitCode !== 0) report.errors.push(`Syntaxfehler:\n${output(compiled)}`)
    // ruff: E9/F = echte Fehler, B = typische Bugs, S = Sicherheitsregeln (bandit)
    const ruff = await run($, ['ruff', 'check', '--no-cache', '--output-format', 'concise', '--select', 'E9,F,B,S', path])
    if (ruff && ruff.exitCode === 1) report.errors.push(`ruff:\n${output(ruff)}`)
  } else if (/\.(js|mjs|cjs)$/i.test(path)) {
    const node = await run($, ['node', '--check', path])
    if (node && node.exitCode !== 0) report.errors.push(`Syntaxfehler:\n${output(node)}`)
  } else if (/\.(sh|bash)$/i.test(path)) {
    const bash = await run($, ['bash', '-n', path])
    if (bash && bash.exitCode !== 0) report.errors.push(`Syntaxfehler:\n${output(bash)}`)
    const sc = await run($, ['shellcheck', '-f', 'gcc', path])
    if (sc && sc.exitCode !== 0) report.errors.push(`shellcheck:\n${output(sc)}`)
  } else if (/\.json$/i.test(path)) {
    try {
      JSON.parse(text)
    } catch (err) {
      report.errors.push(`Ungültiges JSON: ${(err as Error).message}`)
    }
  }

  report.security = scanSecurity(path, text).map(f => `Zeile ${f.line}: ${f.message} [${f.rule}]`)
  return report
}

function hasFindings(r: Report) {
  return r.errors.length > 0 || r.security.length > 0
}

function describe(r: Report) {
  const parts = [`Datei: ${r.path}`]
  if (r.errors.length) parts.push('FEHLER:\n' + r.errors.join('\n\n'))
  if (r.security.length) parts.push('MÖGLICHE SICHERHEITSLÜCKEN:\n' + r.security.map(s => '- ' + s).join('\n'))
  return parts.join('\n')
}

const INSTRUCTION =
  'Der Selbst-Check hat Probleme in deiner Änderung gefunden. Behebe sie jetzt direkt, bevor du weitermachst. ' +
  'Ist ein Sicherheitshinweis ein Fehlalarm, begründe das dem Nutzer kurz und markiere die Zeile mit dem Kommentar "selbst-check: ok".'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'selbstcheck',
      description: 'Prüft alle geänderten Dateien im Repo auf Fehler und Sicherheitslücken.',
    })
    return next(e)
  })

  // Nach jeder Datei-Änderung prüfen und Funde direkt an Claude zurückgeben.
  on('tool.call', async ($, e, next) => {
    if (e.tool !== 'Edit' && e.tool !== 'Write') return next(e)
    const ran = await next(e)
    if (ran.deny !== undefined || ran.isError === true) return ran

    const report = await checkFile($, e.file_path, e.tool === 'Write' ? e.content : undefined)
    const name = e.file_path.split('/').pop()
    if (!hasFindings(report)) {
      $.ui.status(`Selbst-Check ✓ ${name}`)
      return ran
    }
    const count = report.errors.length + report.security.length
    $.ui.status(`Selbst-Check ⚠ ${count} Problem(e) in ${name}`)
    return { ...ran, context: [...(ran.context ?? []), `${INSTRUCTION}\n\n${describe(report)}`] }
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'selbstcheck' }, async $ => {
    const changed = await run($, ['git', 'diff', '--name-only', 'HEAD'])
    const untracked = await run($, ['git', 'ls-files', '--others', '--exclude-standard'])
    if (!changed && !untracked) return { text: 'Selbst-Check: kein Git-Repository gefunden.' }

    const files = [...new Set(`${changed?.stdout ?? ''}\n${untracked?.stdout ?? ''}`.split('\n').filter(Boolean))].slice(0, 50)
    if (files.length === 0) return { text: 'Selbst-Check: keine geänderten Dateien.' }

    const reports = (await Promise.all(files.map(f => checkFile($, f)))).filter(hasFindings)
    if (reports.length === 0) {
      $.ui.status('Selbst-Check ✓ alles sauber')
      return { text: `Selbst-Check: ${files.length} Datei(en) geprüft, keine Probleme gefunden.` }
    }
    $.ui.status(`Selbst-Check ⚠ Probleme in ${reports.length} Datei(en)`)
    return {
      text: `Selbst-Check: ${files.length} Datei(en) geprüft, Probleme in ${reports.length}.\n\n${reports.map(describe).join('\n\n')}`,
      context: [INSTRUCTION],
    }
  })
}
