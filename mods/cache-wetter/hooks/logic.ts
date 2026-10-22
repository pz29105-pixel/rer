export type Ttl = '5m' | '1h'
export type Level = 'green' | 'yellow' | 'red' | 'expired'
export type Weather = 'sun' | 'rain' | 'storm'
export type Usage = {
  input_tokens: number
  cache_read_input_tokens: number
  cache_creation_input_tokens: number
}

export const CELLS = 20
export const FALLBACK_THRESHOLD = 0.83
export const LOG_LIMIT = 1800

export const ttlMs = (ttl: Ttl): number => (ttl === '1h' ? 3_600_000 : 300_000)

const isOn = (v: string | undefined): boolean => v !== undefined && v !== '' && v !== '0' && v.toLowerCase() !== 'false'

/** Einstellung gewinnt, dann was die Sitzung gemeldet hat, dann die Umgebung, sonst 5 Minuten. */
export const resolveTtl = (setting: string | undefined, seen: Ttl | null, env1h: string | undefined, env5m: string | undefined): Ttl => {
  if (setting === '5m' || setting === '1h') return setting
  if (seen !== null) return seen
  if (isOn(env5m)) return '5m'
  return isOn(env1h) ? '1h' : '5m'
}

/** Verbleibender Anteil des Caches, 0 bis 1. */
export const remainingRatio = (lastAt: number, now: number, ttl: Ttl): number => {
  const total = ttlMs(ttl)
  return Math.max(0, Math.min(1, (total - (now - lastAt)) / total))
}

export const minutesLeft = (ratio: number, ttl: Ttl): number => Math.ceil((ratio * ttlMs(ttl)) / 60_000)

/** Grün, im letzten Viertel gelb, in den letzten 10 % rot, bei 0 abgelaufen. */
export const levelOf = (ratio: number): Level => {
  if (ratio <= 0) return 'expired'
  if (ratio <= 0.1) return 'red'
  if (ratio <= 0.25) return 'yellow'
  return 'green'
}

export const bar = (ratio: number, cells = CELLS): { filled: string; empty: string } => {
  const n = Math.max(0, Math.min(cells, Math.ceil(ratio * cells - 1e-9)))
  return { filled: '■'.repeat(n), empty: '□'.repeat(cells - n) }
}

/** Anteil der Input-Tokens, der aus dem Cache kam, in Prozent. */
export const hitRate = (u: Usage): number | undefined => {
  const all = u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens
  return all > 0 ? Math.round((u.cache_read_input_tokens / all) * 100) : undefined
}

export const thresholdOf = (window: number, threshold: number | undefined): number =>
  threshold !== undefined && threshold > 0 ? threshold : Math.round(window * FALLBACK_THRESHOLD)

/** Sonne bis zur Hälfte der Schwelle, Regen bis 80 % davon, Gewitter darüber. */
export const weatherOf = (tokens: number, threshold: number): Weather => {
  const share = threshold > 0 ? tokens / threshold : 0
  if (share <= 0.5) return 'sun'
  if (share <= 0.8) return 'rain'
  return 'storm'
}

export const EMOJI: Record<Weather, string> = { sun: '☀️', rain: '🌧️', storm: '⛈️' }

export const percent = (part: number, whole: number): number => (whole > 0 ? Math.round((part / whole) * 100) : 0)

export const fmtTokens = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1).replace('.0', '')}k` : String(n))

/** Teilt einen Text an Absätzen in Stücke bis `max` Zeichen; zu lange Absätze an Zeilen, dann an Wörtern. */
export const splitSummary = (text: string, max = LOG_LIMIT): string[] => {
  const pieces: string[] = []
  const pushLong = (para: string) => {
    let rest = para
    while (rest.length > max) {
      let cut = rest.lastIndexOf('\n', max)
      if (cut < max / 2) cut = rest.lastIndexOf(' ', max)
      if (cut < max / 2) cut = max
      pieces.push(rest.slice(0, cut).trimEnd())
      rest = rest.slice(cut).trimStart()
    }
    if (rest) pieces.push(rest)
  }

  const chunks: string[] = []
  let current = ''
  for (const para of text.trim().split(/\n{2,}/)) {
    if (para.length > max) {
      if (current) chunks.push(current)
      current = ''
      pieces.length = 0
      pushLong(para)
      chunks.push(...pieces)
      continue
    }
    if (current && current.length + 2 + para.length > max) {
      chunks.push(current)
      current = para
    } else {
      current = current ? `${current}\n\n${para}` : para
    }
  }
  if (current) chunks.push(current)
  return chunks
}
