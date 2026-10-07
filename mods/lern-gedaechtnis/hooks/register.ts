import type { EngineInterface, Register } from 'claude-code'
import { addRule, formatRules, mergeRules, parseRules, removeRule, type Rule } from './rules.ts'

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

const KEY = 'regeln'
const TOOL = 'mcp__lern-gedaechtnis__regel_merken'

// Regeln vom Rechner (Store) und aus dem Projekt zusammenführen.
const load = async ($: EngineInterface) => mergeRules(parseRules(await $.store.get(KEY)), parseRules(await getSetting($, KEY)))
const save = ($: EngineInterface, rules: Rule[]) => setSetting($, KEY, rules)
const hint = (inProject: boolean) => (inProject ? `\n${COMMIT_HINT}` : '')

const GUIDE = `# Lern-Gedächtnis
Wenn der Nutzer dich korrigiert oder eine dauerhafte Vorliebe äußert (z. B. "nein, mach das immer so", "kürzer bitte", "frag vorher", "nutze pnpm statt npm"), rufe sofort das Werkzeug ${TOOL} auf. Formuliere die Regel kurz, allgemein und als Anweisung an dich selbst. Merke dir keine einmaligen Details der aktuellen Aufgabe, keine Geheimnisse und nichts, was der Nutzer nicht so gemeint hat. Ist .claude/mod-einstellungen.json im Projekt geändert, checke sie beim nächsten Commit mit ein.`

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.tool.register({
      name: 'regel_merken',
      description:
        'Speichert eine dauerhafte Regel aus einer Korrektur oder Vorliebe des Nutzers. Sie gilt ab dann in allen Sitzungen. Nur für wiederkehrende Vorlieben, nicht für Details der aktuellen Aufgabe.',
      inputSchema: {
        type: 'object',
        properties: { regel: { type: 'string', description: 'Kurze Anweisung an dich selbst, z. B. "Antworte immer auf Deutsch."' } },
        required: ['regel'],
      },
    })
    await $.command.register({ name: 'regeln', description: 'Zeigt alle gemerkten Regeln.' })
    await $.command.register({ name: 'regel', description: 'Fügt eine Regel von Hand hinzu.', argumentHint: '<Regel>' })
    await $.command.register({ name: 'regel-loeschen', description: 'Löscht eine Regel nach Nummer, oder alle mit "alle".', argumentHint: '<Nr | alle>' })
    return next(e)
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    const rules = await load($)
    const text = rules.length
      ? `${GUIDE}\n\nBereits gelernte Regeln des Nutzers, halte dich daran (neueste zuerst, bei Widerspruch gilt die neuere):\n${formatRules(rules)}`
      : GUIDE
    return { sections: [...composed.sections, { id: 'lern-gedaechtnis:regeln', text, scope: 'session' }] }
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: TOOL }, async ($, e) => {
    const regel = (e as { regel?: unknown }).regel
    if (typeof regel !== 'string' || !regel.trim()) return { result: 'Keine Regel angegeben.' }
    const { rules, isNew } = addRule(await load($), regel, new Date().toISOString())
    const inProject = await save($, rules)
    $.ui.toast(`Gemerkt: ${rules[0]!.text}`)
    return { result: (isNew ? `Regel gespeichert (${rules.length} insgesamt).` : 'Regel war schon bekannt und wurde aufgefrischt.') + hint(inProject) }
  })

  on('command.run', { command: 'regeln' }, async $ => {
    const rules = await load($)
    return { text: rules.length ? `Gemerkte Regeln:\n${formatRules(rules)}` : 'Noch keine Regeln gemerkt.' }
  })

  on('command.run', { command: 'regel' }, async ($, e) => {
    if (!e.args.trim()) return { text: 'Bitte die Regel mitgeben, z. B. /regel Antworte immer auf Deutsch.' }
    const { rules } = addRule(await load($), e.args, new Date().toISOString())
    const inProject = await save($, rules)
    return { text: `Gemerkt: ${rules[0]!.text}${hint(inProject)}` }
  })

  on('command.run', { command: 'regel-loeschen' }, async ($, e) => {
    const arg = e.args.trim()
    if (/^alle$/i.test(arg)) {
      const inProject = await setSetting($, KEY, undefined)
      return { text: `Alle Regeln gelöscht.${hint(inProject)}` }
    }
    const { rules, removed } = removeRule(await load($), Number(arg))
    if (!removed) return { text: 'Keine Regel mit dieser Nummer. /regeln zeigt die Liste.' }
    const inProject = await save($, rules)
    return { text: `Gelöscht: ${removed.text}${hint(inProject)}` }
  })
}
