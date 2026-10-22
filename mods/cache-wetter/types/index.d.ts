export type CacheInfo = {
  /** Zeitpunkt der letzten Antwort, in $.clock.now()-Millisekunden; fehlt nach einem Compact bis zur nächsten Antwort */
  lastAt?: number
  /** Cache-Quote der letzten Antwort in Prozent */
  hit?: number
  /** Kontext in Tokens nach der letzten Antwort */
  tokens?: number
  /** Kontextfenster in Tokens */
  window?: number
  /** Auto-Compact-Schwelle in Tokens */
  threshold?: number
}

declare module 'claude-code' {
  interface PluginState {
    'cache-wetter': {
      info: CacheInfo | null
      tick: number
      isCollapsed: boolean
      seenTtl: '5m' | '1h' | null
    }
  }
}
