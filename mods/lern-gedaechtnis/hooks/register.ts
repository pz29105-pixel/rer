import type { EngineInterface, Register } from 'claude-code'
import { addRule, formatRules, parseRules, removeRule, type Rule } from './rules.ts'

const KEY = 'regeln'
const TOOL = 'mcp__lern-gedaechtnis__regel_merken'

const load = async ($: EngineInterface) => parseRules(await $.store.get(KEY))
const save = ($: EngineInterface, rules: Rule[]) => $.store.set(KEY, rules)

const GUIDE = `# Lern-Gedächtnis
Wenn der Nutzer dich korrigiert oder eine dauerhafte Vorliebe äußert (z. B. "nein, mach das immer so", "kürzer bitte", "frag vorher", "nutze pnpm statt npm"), rufe sofort das Werkzeug ${TOOL} auf. Formuliere die Regel kurz, allgemein und als Anweisung an dich selbst. Merke dir keine einmaligen Details der aktuellen Aufgabe, keine Geheimnisse und nichts, was der Nutzer nicht so gemeint hat.`

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
    await save($, rules)
    $.ui.toast(`Gemerkt: ${rules[0]!.text}`)
    return { result: isNew ? `Regel gespeichert (${rules.length} insgesamt).` : 'Regel war schon bekannt und wurde aufgefrischt.' }
  })

  on('command.run', { command: 'regeln' }, async $ => {
    const rules = await load($)
    return { text: rules.length ? `Gemerkte Regeln:\n${formatRules(rules)}` : 'Noch keine Regeln gemerkt.' }
  })

  on('command.run', { command: 'regel' }, async ($, e) => {
    if (!e.args.trim()) return { text: 'Bitte die Regel mitgeben, z. B. /regel Antworte immer auf Deutsch.' }
    const { rules } = addRule(await load($), e.args, new Date().toISOString())
    await save($, rules)
    return { text: `Gemerkt: ${rules[0]!.text}` }
  })

  on('command.run', { command: 'regel-loeschen' }, async ($, e) => {
    const arg = e.args.trim()
    if (/^alle$/i.test(arg)) {
      await $.store.delete(KEY)
      return { text: 'Alle Regeln gelöscht.' }
    }
    const { rules, removed } = removeRule(await load($), Number(arg))
    if (!removed) return { text: 'Keine Regel mit dieser Nummer. /regeln zeigt die Liste.' }
    await save($, rules)
    return { text: `Gelöscht: ${removed.text}` }
  })
}
