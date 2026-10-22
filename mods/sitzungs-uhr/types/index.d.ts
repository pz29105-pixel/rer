export type Zaehler = number

declare module 'claude-code' {
  interface PluginState {
    'sitzungs-uhr': { count: Zaehler; tick: Zaehler }
  }
}
