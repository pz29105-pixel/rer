import type { EngineInterface, Register } from 'claude-code'
import { UI_FILE, scanDesign } from './rules.ts'

// Einstellungen liegen im Store (bleibt auf dem eigenen Rechner) und zusätzlich
// in einer Datei im Projekt (bleibt in Cloud-Sitzungen, sobald sie committet ist).
// Dieser Block ist in lern-gedaechtnis, design-eigenstil und spar-pilot gleich ($ darf nicht über Dateigrenzen gereicht werden).
const PROJECT_FILE = '.claude/mod-einstellungen.json'

let projectRoot: string | null | undefined

async function root($: EngineInterface) {
  if (projectRoot !== undefined) return projectRoot
  try {
    const r = await $.process.run(['git', 'rev-parse', '--show-toplevel'])
    projectRoot = r.exitCode === 0 ? r.stdout.trim() : null
  } catch {
    projectRoot = null
  }
  return projectRoot
}

async function readFile($: EngineInterface, dir: string): Promise<Record<string, unknown>> {
  try {
    const data: unknown = JSON.parse(await $.fs.read(`${dir}/${PROJECT_FILE}`))
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

// Wert aus der Projektdatei, sonst aus dem Store.
async function getSetting($: EngineInterface, key: string): Promise<unknown> {
  const dir = await root($)
  if (dir) {
    const data = await readFile($, dir)
    if (key in data) return data[key]
  }
  return $.store.get(key)
}

// Schreibt in Store und Projektdatei; `undefined` löscht. Antwortet, ob die Projektdatei geschrieben wurde.
async function setSetting($: EngineInterface, key: string, value: unknown): Promise<boolean> {
  if (value === undefined) await $.store.delete(key)
  else await $.store.set(key, value)
  const dir = await root($)
  if (!dir) return false
  try {
    const data = await readFile($, dir)
    if (value === undefined) delete data[key]
    else data[key] = value
    await $.fs.write(`${dir}/${PROJECT_FILE}`, JSON.stringify(data, null, 2) + '\n')
    return true
  } catch {
    return false
  }
}

const COMMIT_HINT = `Gespeichert in ${PROJECT_FILE} – beim nächsten Commit mit einchecken, damit es auch in Cloud-Sitzungen gilt.`

const STYLE_KEY = 'designstil'

const PRINCIPLES = `# Design: eigenständig statt 08/15
Wenn du Oberflächen baust (Webseiten, Apps, Komponenten, Artifacts, Folien), gestalte sie so, dass sie sich klar von Vorlagen abheben.

1. Richtung zuerst: Wähle vor dem Code eine klare ästhetische Richtung, die zu Zweck und Zielgruppe passt (z. B. editorial/Magazin, brutalistisch, Swiss/International, Retro-Futurismus, organisch-natürlich, luxuriös-minimal, verspielt, industriell/technisch, Art déco, handgemacht). Nenne sie in einem Satz und zieh sie konsequent durch. Mutig und präzise schlägt brav und beliebig.
2. Typografie: Kombiniere eine Display-Schrift mit Charakter mit einer gut lesbaren Textschrift. Vermeide Inter, Roboto, Poppins, Montserrat, Arial und reine Systemschriften. Nutze starke Größenkontraste und eine gezielte Laufweite bei großen Überschriften.
3. Farbe: Eine dominante Grundfarbe und ein scharfer Akzent, als CSS-Variablen. Keine Lila-Blau-Verläufe auf Weiß, kein Tailwind-Standard-Indigo, keine zaghafte, gleichmäßig verteilte Palette.
4. Layout: Asymmetrie, Überlappungen, bewusste Rasterbrüche, großzügiger Weißraum oder kontrollierte Dichte. Vermeide das Schema „zentrierter Hero, drei gleiche Feature-Karten, CTA-Button“.
5. Atmosphäre: Hintergründe mit Tiefe statt Flächenfarbe (Körnung, Muster, Verlaufsnetze, Linien, Formen). Schatten, Rahmen und Radien bewusst gestalten statt überall rounded-xl + shadow-lg.
6. Bewegung: Lieber ein durchdachter Seitenauftritt mit gestaffeltem Einblenden und überraschende Hover-Zustände als viele verstreute Mikroanimationen. prefers-reduced-motion beachten.
7. Details: Einheitliche SVG-Icons statt Emoji. Konkreter Text statt Floskeln wie „Welcome to“, „Unlock the power“, „nahtlos“, kein Lorem ipsum.
8. Abwechslung: Nicht bei jedem Projekt dieselben Entscheidungen treffen (z. B. immer Space Grotesk oder immer Dunkelmodus mit Neon). Jedes Design soll für seinen Zweck gemacht wirken.
9. Handwerk bleibt Pflicht: ausreichender Kontrast, responsiv bis Handybreite, Hell- und Dunkelmodus, sichtbarer Fokus.`

const INSTRUCTION =
  'Design-Check: Die Datei enthält typische Vorlagen-Muster. Überarbeite diese Stellen jetzt im Sinn der gewählten Designrichtung. ' +
  'Ist ein Muster bewusst gewählt, sag kurz warum und markiere die Zeile mit "design-ok".'

// Pro Datei jede Regel nur einmal melden, damit der Check nicht nervt.
const reported = new Map<string, Set<string>>()

async function readStyle($: EngineInterface) {
  const value = await getSetting($, STYLE_KEY)
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

async function run($: EngineInterface, argv: string[]) {
  try {
    return await $.process.run(argv, { timeoutMs: 20_000 })
  } catch {
    return null
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'designstil',
      description: 'Feste Designrichtung setzen (z. B. "brutalistisch, Schwarz/Signalorange"). Ohne Text: anzeigen. "aus": löschen.',
      argumentHint: '[Richtung | aus]',
    })
    await $.command.register({
      name: 'designcheck',
      description: 'Prüft alle geänderten UI-Dateien im Repo auf 08/15-Design-Muster.',
    })
    return next(e)
  })

  // Design-Regeln und gewählte Richtung in den System-Prompt.
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    const style = await readStyle($)
    const text = style
      ? `${PRINCIPLES}\n\nVom Nutzer festgelegte Designrichtung, gilt für alle Oberflächen: ${style}`
      : PRINCIPLES
    return { sections: [...composed.sections, { id: 'design-eigenstil:regeln', text, scope: 'session' }] }
  }).catch(($, e, next) => next(e))

  // Nach jeder Änderung an einer UI-Datei auf Vorlagen-Muster prüfen.
  on('tool.call', async ($, e, next) => {
    if (e.tool !== 'Edit' && e.tool !== 'Write') return next(e)
    const ran = await next(e)
    if (ran.deny !== undefined || ran.isError === true || !UI_FILE.test(e.file_path)) return ran

    const text = e.tool === 'Write' ? e.content : await $.fs.read(e.file_path)
    const seen = reported.get(e.file_path) ?? new Set<string>()
    const fresh = scanDesign(e.file_path, text).filter(f => !seen.has(f.rule))
    const name = e.file_path.split('/').pop()
    if (fresh.length === 0) {
      $.ui.status(`Design ✓ ${name}`)
      return ran
    }
    fresh.forEach(f => seen.add(f.rule))
    reported.set(e.file_path, seen)
    $.ui.status(`Design ⚠ ${fresh.length} Vorlagen-Muster in ${name}`)
    const list = fresh.map(f => `- ${f.line ? `Zeile ${f.line}: ` : ''}${f.message} [${f.rule}]`).join('\n')
    return { ...ran, context: [...(ran.context ?? []), `${INSTRUCTION}\n\nDatei: ${e.file_path}\n${list}`] }
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'designstil' }, async ($, e) => {
    const arg = e.args.trim()
    if (arg === '') {
      const style = await readStyle($)
      return { text: style ? `Aktuelle Designrichtung: ${style}` : 'Keine feste Designrichtung gesetzt – Claude wählt pro Projekt eine passende.' }
    }
    if (/^(aus|off|löschen|reset)$/i.test(arg)) {
      const inProject = await setSetting($, STYLE_KEY, undefined)
      return { text: `Designrichtung gelöscht.${inProject ? `\n${COMMIT_HINT}` : ''}` }
    }
    const inProject = await setSetting($, STYLE_KEY, arg)
    return { text: `Designrichtung gespeichert: ${arg}${inProject ? `\n${COMMIT_HINT}` : ''}` }
  })

  on('command.run', { command: 'designcheck' }, async $ => {
    const changed = await run($, ['git', 'diff', '--name-only', 'HEAD'])
    const untracked = await run($, ['git', 'ls-files', '--others', '--exclude-standard'])
    if (!changed && !untracked) return { text: 'Design-Check: kein Git-Repository gefunden.' }

    const files = [...new Set(`${changed?.stdout ?? ''}\n${untracked?.stdout ?? ''}`.split('\n'))]
      .filter(f => UI_FILE.test(f))
      .slice(0, 50)
    if (files.length === 0) return { text: 'Design-Check: keine geänderten UI-Dateien.' }

    const results: string[] = []
    for (const file of files) {
      let text: string
      try {
        text = await $.fs.read(file)
      } catch {
        continue
      }
      const found = scanDesign(file, text)
      if (found.length) results.push(`${file}\n${found.map(f => `- ${f.line ? `Zeile ${f.line}: ` : ''}${f.message}`).join('\n')}`)
    }
    if (results.length === 0) return { text: `Design-Check: ${files.length} UI-Datei(en) geprüft, keine Vorlagen-Muster gefunden.` }
    return {
      text: `Design-Check: Vorlagen-Muster in ${results.length} von ${files.length} Datei(en).\n\n${results.join('\n\n')}`,
      context: [INSTRUCTION],
    }
  })
}
