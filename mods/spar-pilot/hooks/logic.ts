export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'
export type Mode = 'aus' | 'sparsam' | 'ausgewogen' | 'qualitaet'
export type TaskClass = 'keep' | 'trivial' | 'normal' | 'hard'

export const MODES: readonly Mode[] = ['aus', 'sparsam', 'ausgewogen', 'qualitaet']
const LADDER: readonly Effort[] = ['low', 'medium', 'high', 'xhigh', 'max']
const rank = (e: Effort) => LADDER.indexOf(e)

const TARGET: Record<Exclude<Mode, 'aus'>, Record<Exclude<TaskClass, 'keep'>, Effort>> = {
  sparsam: { trivial: 'low', normal: 'low', hard: 'medium' },
  ausgewogen: { trivial: 'low', normal: 'medium', hard: 'high' },
  qualitaet: { trivial: 'medium', normal: 'high', hard: 'xhigh' },
}

// Ab dieser Kontextgröße kostet das Neu-Einlesen nach einem Wechsel mehr, als weniger Denken spart.
export const DOWNGRADE_LIMIT = 20_000
// Im Sparmodus wird auch für schwere Aufgaben nur bis zu dieser Größe hochgeschaltet.
export const SPARSAM_UPGRADE_LIMIT = 100_000

const CONFIRM = /^(ja+|jo|jep|ok(ay)?|yes|yep|mach( das| weiter)?|weiter|go|los|passt|genau|bitte|klar|gerne|super|top|👍)[\s!.]*$/i
const BUILD_VERB = /\b(bau|erstell|schreib|entwickl|programmier|implementier|build|create|write|implement)\w*/i
const BUILD_THING = /\b(app|mod|plugin|system|feature|seite|website|webseite|programm|skript|script|tool|api|spiel|game|dashboard)s?\b/i
const HARD = /architektur|architecture|refactor|umbau|migrier|migrate|debug|warum (funktioniert|geht|klappt)|fehler.{0,20}(finden|suchen|beheben)|sicherheit|security|performance|optimier|race condition|deadlock|von grund auf|from scratch|komplett neu|planen|plan for|analysier|analy[sz]e/i
const STACK = /```|Traceback|Exception|Error:|\bat \S+ \(.*:\d+/
const TRIVIAL = /danke|thanks|übersetz|translate|tippfehler|typo|umbenenn|rename|zusammenfass|summari[sz]e|formatier|was bedeutet|what does .* mean/i
const QUESTION = /^(was|wer|wie|wo|wann|welche[rsmn]?|wieso|what|who|how|where|when|which|is|ist|sind|gibt es|hast du|brauchst du|kennst du)\b/i

export function classify(text: string): TaskClass {
  const t = text.trim()
  if (t === '' || CONFIRM.test(t)) return 'keep' // Bestätigungen setzen eine geplante Aufgabe fort
  if (t.length > 1200 || STACK.test(t) || (BUILD_VERB.test(t) && BUILD_THING.test(t)) || HARD.test(t)) return 'hard'
  if (t.length < 200 && (TRIVIAL.test(t) || QUESTION.test(t))) return 'trivial'
  return 'normal'
}

export type Decision = { effort: Effort; isSwitch: boolean; reason: string }

export function decide(input: { mode: Mode; taskClass: TaskClass; current: Effort; contextTokens: number }): Decision {
  const { mode, taskClass, current, contextTokens } = input
  const keep = (reason: string): Decision => ({ effort: current, isSwitch: false, reason })
  if (mode === 'aus') return keep('Spar-Pilot aus')
  if (taskClass === 'keep') return keep('Fortsetzung – Einstellung bleibt')

  const target = TARGET[mode][taskClass]
  if (target === current) return keep('passt schon')

  const k = `${Math.round(contextTokens / 1000)}k`
  if (rank(target) > rank(current)) {
    if (mode === 'sparsam' && contextTokens > SPARSAM_UPGRADE_LIMIT) return keep(`schwer, aber ${k} Kontext neu einlesen ist im Sparmodus zu teuer`)
    return { effort: target, isSwitch: true, reason: 'anspruchsvolle Aufgabe → mehr Denkaufwand' }
  }
  if (contextTokens > DOWNGRADE_LIMIT) return keep(`leichte Aufgabe, aber ${k} Kontext neu einlesen wäre teurer als die Ersparnis`)
  return { effort: target, isSwitch: true, reason: 'leichte Aufgabe, kleiner Kontext → weniger Denkaufwand' }
}

export type Usage = { input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number }

// API-Listenpreise in $ pro Million Tokens (Stand 2026-09). Cache-Schreiben als 1,25 × Input angenommen.
const PRICES: { match: string; input: number; output: number; cacheRead: number }[] = [
  { match: 'fable-5', input: 10, output: 50, cacheRead: 0.25 },
  { match: 'mythos-5', input: 10, output: 50, cacheRead: 0.25 },
  { match: 'opus-5-5', input: 4, output: 20, cacheRead: 0.2 },
  { match: 'opus', input: 5, output: 25, cacheRead: 0.5 },
  { match: 'sonnet-5', input: 2, output: 10, cacheRead: 0.2 },
  { match: 'sonnet-4', input: 3, output: 15, cacheRead: 0.3 },
  { match: 'haiku', input: 1, output: 5, cacheRead: 0.1 },
]

export function cost(usage: Usage, model: string): number | undefined {
  const p = PRICES.find(price => model.includes(price.match))
  if (!p) return undefined
  return (
    (usage.input_tokens * p.input +
      usage.cache_creation_input_tokens * p.input * 1.25 +
      usage.cache_read_input_tokens * p.cacheRead +
      usage.output_tokens * p.output) /
    1_000_000
  )
}

export const contextOf = (u: Usage) => u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens

export function parseMode(value: unknown): Mode {
  return MODES.includes(value as Mode) ? (value as Mode) : 'ausgewogen'
}

export const isEffort = (value: unknown): value is Effort => LADDER.includes(value as Effort)
