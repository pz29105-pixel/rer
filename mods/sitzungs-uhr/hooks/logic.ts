/** Laufzeit kurz und deutsch: "45 s", "7 Min", "1 Std 05 Min". */
export const formatDuration = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000))
  if (total < 60) return `${total} s`
  const minutes = Math.floor(total / 60)
  if (minutes < 60) return `${minutes} Min`
  return `${Math.floor(minutes / 60)} Std ${String(minutes % 60).padStart(2, '0')} Min`
}

export const formatCount = (n: number): string => `${n} ${n === 1 ? 'Nachricht' : 'Nachrichten'}`

/** Zählt, was der Nutzer geschrieben hat: Nutzer-Zeilen mit Text, ohne reine Werkzeug-Ergebnisse. */
export const countUserMessages = (messages: readonly { role: string; text: string; toolResults?: readonly unknown[] }[]): number =>
  messages.filter(m => m.role === 'user' && m.text.trim() !== '' && !(m.toolResults && m.toolResults.length > 0)).length

/** Nur eigene Eingaben zählen, keine Benachrichtigungen, Zeitpläne oder Plugins. */
export const isOwnPrompt = (kind: string): boolean => kind === 'composer' || kind === 'bridge'
