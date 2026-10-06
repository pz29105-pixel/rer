import type { EngineInterface, Register } from 'claude-code'
import { classify, detectTestCommand, isCodeChange, tail } from './detect.ts'

// Wie oft Claude pro Aufgabe zurückgeschickt wird, bevor der Wächter aufgibt.
const MAX_ATTEMPTS = 3

let isDirty = false
let attempts = 0

const overrideKey = (cwd: string) => `testbefehl:${cwd}`

async function readOptional($: EngineInterface, path: string) {
  try {
    return await $.fs.read(path)
  } catch {
    return undefined
  }
}

async function testCommand($: EngineInterface, cwd: string): Promise<string[] | undefined> {
  const custom = await $.store.get(overrideKey(cwd))
  if (typeof custom === 'string' && custom.trim()) return ['bash', '-lc', custom]
  let names: string[] = []
  try {
    names = (await $.fs.list(cwd)).map(entry => entry.name)
  } catch {
    return undefined
  }
  return detectTestCommand({
    names,
    packageJson: names.includes('package.json') ? await readOptional($, `${cwd}/package.json`) : undefined,
    makefile: names.includes('Makefile') ? await readOptional($, `${cwd}/Makefile`) : undefined,
  })
}

async function runTests($: EngineInterface, cwd: string) {
  const argv = await testCommand($, cwd)
  if (!argv) return { state: 'none' as const }
  const label = argv[0] === 'bash' ? argv[2]! : argv.join(' ')
  $.ui.status(`Tests laufen: ${label}`)
  try {
    const r = await $.process.run(argv, { cwd, timeoutMs: 300_000 })
    const output = `${r.stdout}\n${r.stderr}`
    return { state: classify(argv, r.exitCode, output), label, output: tail(output) }
  } catch (err) {
    return { state: 'missing' as const, label, output: (err as Error).message }
  }
}

async function currentDir($: EngineInterface) {
  const r = await $.process.run(['pwd'])
  return r.stdout.trim()
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'tests', description: 'Führt die Projekttests jetzt aus.' })
    await $.command.register({
      name: 'testbefehl',
      description: 'Eigenen Testbefehl für dieses Projekt setzen (z. B. "npm run test:unit"). Ohne Text: anzeigen. "aus": automatische Erkennung.',
      argumentHint: '[Befehl | aus]',
    })
    return next(e)
  })

  // Merken, ob in dieser Aufgabe Code geändert wurde.
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    if ((e.tool === 'Edit' || e.tool === 'Write') && ran.deny === undefined && ran.isError !== true && isCodeChange(e.file_path)) {
      isDirty = true
    }
    return ran
  }).catch(($, e, next) => next(e))

  // Bevor Claude "fertig" sagt: Tests laufen lassen, bei Rot zurück an die Arbeit.
  on('classic.Stop', async ($, e, next) => {
    if (!e.stop_hook_active) attempts = 0
    if (!isDirty || e.agent_id) return next(e)

    const run = await runTests($, e.cwd)
    if (run.state === 'none' || run.state === 'missing') {
      isDirty = false
      $.ui.status(run.state === 'none' ? 'Tests: kein Testbefehl gefunden (/testbefehl)' : `Tests: ${run.label} nicht ausführbar`)
      return next(e)
    }
    if (run.state === 'passed') {
      isDirty = false
      $.ui.status(`Tests ✓ ${run.label}`)
      return next(e)
    }
    if (attempts >= MAX_ATTEMPTS) {
      isDirty = false
      $.ui.status(`Tests ✗ nach ${MAX_ATTEMPTS} Versuchen noch rot`)
      $.ui.toast(`Test-Wächter: Tests nach ${MAX_ATTEMPTS} Korrekturversuchen weiter rot – bitte selbst ansehen.`)
      return next(e)
    }
    attempts++
    $.ui.status(`Tests ✗ – Korrekturversuch ${attempts}/${MAX_ATTEMPTS}`)
    return {
      block:
        `Test-Wächter: Die Projekttests sind nach deinen Änderungen rot (${run.label}). ` +
        `Du bist noch nicht fertig. Finde die Ursache und behebe sie (Versuch ${attempts} von ${MAX_ATTEMPTS}). ` +
        `Ändere Tests nur, wenn sie wirklich falsch sind, und sag das dann ausdrücklich.\n\n${run.output}`,
    }
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'tests' }, async $ => {
    const run = await runTests($, await currentDir($))
    if (run.state === 'none') return { text: 'Kein Testbefehl gefunden. Mit /testbefehl <Befehl> festlegen.' }
    if (run.state === 'missing') return { text: `Tests nicht ausführbar (${run.label}):\n${run.output}` }
    $.ui.status(run.state === 'passed' ? `Tests ✓ ${run.label}` : `Tests ✗ ${run.label}`)
    return { text: `${run.state === 'passed' ? 'Tests grün ✓' : 'Tests rot ✗'} (${run.label})\n\n${run.output}` }
  })

  on('command.run', { command: 'testbefehl' }, async ($, e) => {
    const cwd = await currentDir($)
    const arg = e.args.trim()
    if (arg === '') {
      const argv = await testCommand($, cwd)
      return { text: argv ? `Testbefehl: ${argv[0] === 'bash' ? argv[2] : argv.join(' ')}` : 'Kein Testbefehl gefunden.' }
    }
    if (/^(aus|auto|reset)$/i.test(arg)) {
      await $.store.delete(overrideKey(cwd))
      return { text: 'Eigener Testbefehl entfernt, automatische Erkennung aktiv.' }
    }
    await $.store.set(overrideKey(cwd), arg)
    return { text: `Testbefehl für ${cwd} gespeichert: ${arg}` }
  })
}
