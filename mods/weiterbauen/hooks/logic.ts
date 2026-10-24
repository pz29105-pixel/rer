// Obergrenze: so viele Folgeschritte pro Auftrag, danach wartet Claude auf dich.
export const MAX_ROUNDS = 5

export type Parsed = { kind: 'show' } | { kind: 'off' } | { kind: 'goal'; goal: string }

export function parseArg(arg: string): Parsed {
  const text = arg.trim()
  if (text === '') return { kind: 'show' }
  if (/^(aus|stop|ende)$/i.test(text)) return { kind: 'off' }
  return { kind: 'goal', goal: text }
}

export function nextPrompt(goal: string, round: number, max: number = MAX_ROUNDS): string {
  return (
    `Dauerbau: Dein Ziel lautet „${goal}“. Erstelle jetzt selbstständig den nächsten sinnvollen Schritt ` +
    `als Code oder Datei (Runde ${round} von ${max}). Prüfe das Ergebnis kurz. ` +
    `Ist das Ziel vollständig erreicht, sag das ausdrücklich und erstelle nichts Neues.`
  )
}

export function isDone(text: string): boolean {
  return /\b(ziel (ist )?(vollständig )?erreicht|nichts mehr zu tun|fertig gebaut)\b/i.test(text)
}
