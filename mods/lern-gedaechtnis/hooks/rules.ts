export type Rule = { text: string; created: string }

export const MAX_RULES = 60

const normalize = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

export function parseRules(value: unknown): Rule[] {
  if (!Array.isArray(value)) return []
  return value.filter((r): r is Rule => typeof r?.text === 'string' && typeof r?.created === 'string')
}

// Neue Regel vorne einfügen; Dubletten ersetzen, älteste fallen bei Überlauf weg.
export function addRule(rules: Rule[], text: string, now: string): { rules: Rule[]; isNew: boolean } {
  const clean = text.trim().replace(/\s+/g, ' ').slice(0, 300)
  const key = normalize(clean)
  const rest = rules.filter(r => normalize(r.text) !== key)
  return { rules: [{ text: clean, created: now }, ...rest].slice(0, MAX_RULES), isNew: rest.length === rules.length }
}

// Regeln aus mehreren Quellen vereinen: Dubletten raus, neueste zuerst.
export function mergeRules(...sources: Rule[][]): Rule[] {
  const byKey = new Map<string, Rule>()
  for (const rule of sources.flat()) {
    const key = normalize(rule.text)
    const known = byKey.get(key)
    if (!known || rule.created > known.created) byKey.set(key, rule)
  }
  return [...byKey.values()].sort((a, b) => b.created.localeCompare(a.created)).slice(0, MAX_RULES)
}

// Nummern sind 1-basiert, wie in der Liste angezeigt.
export function removeRule(rules: Rule[], number: number): { rules: Rule[]; removed?: Rule } {
  const removed = rules[number - 1]
  if (!removed) return { rules }
  return { rules: rules.filter((_, i) => i !== number - 1), removed }
}

export function formatRules(rules: Rule[]) {
  return rules.map((r, i) => `${i + 1}. ${r.text}`).join('\n')
}
