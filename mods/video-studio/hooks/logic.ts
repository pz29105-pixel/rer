export type Art = 'regel' | 'gut' | 'schlecht'
export type Lektion = { text: string; art: Art; created: string }
export type Video = { titel: string; hook: string; created: string; ergebnis?: string }

export const MAX_LEKTIONEN = 50
export const MAX_VIDEOS = 40

const ARTEN: Art[] = ['regel', 'gut', 'schlecht']
const normalize = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const clean = (text: string, max: number) => text.trim().replace(/\s+/g, ' ').slice(0, max)

export const STIL = `# Video-Studio (TikTok-Dramas)
Aufbau eines Videos: Format 1:1-Bild mittig auf 9:16 mit weichgezeichneten Balken; 60 s, englisches Voiceover (KI-Stimme), ca. 150 Wörter; alle 1,5–2 s ein neues Bild (ca. 29 Shots) mit langsamem Zoom 100→106 %; ein Wort pro Untertitel (weiß, fett, unten mittig, leichter Schatten); ruhige Dramamusik leise darunter.
Story: Hook (Satz 1) → Setup → Wendepunkt → Auflösung → Ende mit "Follow for part two".
Look jedes Bild-Prompts, Präfix: "2D anime, soft cel shading, cinematic golden backlight, lens glow, dark vignette, painterly detailed background, shallow depth of field, warm amber and deep blue palette, 1:1, no text". Warmes Bernstein = Erinnerung/Wärme, Blau/Schwarz = Spannung/Rache. Kameraabwechslung: Nahaufnahme, Totale, Detail (Hände, Tasse, Papier), Over-the-Shoulder.
Charakter-Sheet pro Geschichte anlegen und in JEDEN Prompt kopieren, damit die Figuren gleich bleiben.
Liefere: Skript, Shotliste (Nr, Zeit, Satzteil, Bild-Prompt), Charakter-Sheet.`

export const ANLEITUNG = `Nach jedem gelieferten Video-Paket rufe video_festhalten auf (Titel, Hook). Gibt der Nutzer Feedback ("gefällt", "zu lang", "Hook war schwach", "Figuren sehen uneinheitlich aus") oder nennt Zahlen (Aufrufe, Likes, Watchtime), rufe sofort video_lektion_merken auf (art gut/schlecht/regel) und bei Zahlen video_ergebnis. Formuliere Lektionen kurz als Anweisung an dich. Wiederhole keine Story, Hook oder Wendung aus der Liste unten; orientiere dich an Videos mit gutem Ergebnis. Hat ein früheres Video noch kein Ergebnis, frag einmal pro Sitzung danach.`

export function parseLektionen(value: unknown): Lektion[] {
  if (!Array.isArray(value)) return []
  return value.filter((l): l is Lektion => typeof l?.text === 'string' && typeof l?.created === 'string' && ARTEN.includes(l?.art))
}

export function parseVideos(value: unknown): Video[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is Video => typeof v?.titel === 'string' && typeof v?.hook === 'string' && typeof v?.created === 'string')
}

// Neue Lektion vorne; Dubletten (gleicher Text) ersetzen, älteste fallen bei Überlauf weg.
export function addLektion(list: Lektion[], text: string, art: Art, now: string): { list: Lektion[]; isNew: boolean } {
  const t = clean(text, 300)
  const key = normalize(t)
  const rest = list.filter(l => normalize(l.text) !== key)
  const safeArt = ARTEN.includes(art) ? art : 'regel'
  return { list: [{ text: t, art: safeArt, created: now }, ...rest].slice(0, MAX_LEKTIONEN), isNew: rest.length === list.length }
}

export function mergeLektionen(...sources: Lektion[][]): Lektion[] {
  const byKey = new Map<string, Lektion>()
  for (const l of sources.flat()) {
    const key = normalize(l.text)
    const known = byKey.get(key)
    if (!known || l.created > known.created) byKey.set(key, l)
  }
  return [...byKey.values()].sort((a, b) => b.created.localeCompare(a.created)).slice(0, MAX_LEKTIONEN)
}

// Nummern sind 1-basiert, wie in der Liste angezeigt.
export function removeLektion(list: Lektion[], nr: number): { list: Lektion[]; removed?: Lektion } {
  const removed = list[nr - 1]
  if (!removed) return { list }
  return { list: list.filter((_, i) => i !== nr - 1), removed }
}

const MARK: Record<Art, string> = { regel: 'Regel', gut: 'Gut', schlecht: 'Vermeiden' }
export const formatLektionen = (list: Lektion[]) => list.map((l, i) => `${i + 1}. [${MARK[l.art]}] ${l.text}`).join('\n')

// Neues Video vorne; gleicher Titel ersetzt den alten Eintrag, ein vorhandenes Ergebnis bleibt erhalten.
export function addVideo(list: Video[], titel: string, hook: string, now: string): Video[] {
  const t = clean(titel, 120)
  const key = normalize(t)
  const old = list.find(v => normalize(v.titel) === key)
  const video: Video = { titel: t, hook: clean(hook, 200), created: now, ...(old?.ergebnis ? { ergebnis: old.ergebnis } : {}) }
  return [video, ...list.filter(v => normalize(v.titel) !== key)].slice(0, MAX_VIDEOS)
}

export function mergeVideos(...sources: Video[][]): Video[] {
  const byKey = new Map<string, Video>()
  for (const v of sources.flat()) {
    const key = normalize(v.titel)
    const known = byKey.get(key)
    if (!known) byKey.set(key, v)
    else byKey.set(key, { ...(v.created > known.created ? v : known), ...(v.ergebnis || known.ergebnis ? { ergebnis: v.ergebnis ?? known.ergebnis } : {}) })
  }
  return [...byKey.values()].sort((a, b) => b.created.localeCompare(a.created)).slice(0, MAX_VIDEOS)
}

// Ergebnis ans Video mit der Nummer aus der Liste hängen (1-basiert).
export function setErgebnis(list: Video[], nr: number, ergebnis: string): { list: Video[]; video?: Video } {
  const old = list[nr - 1]
  if (!old) return { list }
  const video = { ...old, ergebnis: clean(ergebnis, 200) }
  return { list: list.map((v, i) => (i === nr - 1 ? video : v)), video }
}

export const formatVideos = (list: Video[]) =>
  list.map((v, i) => `${i + 1}. ${v.titel} – Hook: "${v.hook}" – ${v.ergebnis ? `Ergebnis: ${v.ergebnis}` : 'Ergebnis offen'}`).join('\n')

// Abschnitt für den System-Prompt: kurz halten, er kostet bei jeder Anfrage Tokens.
export function buildSection(lektionen: Lektion[], videos: Video[]): string {
  const parts = [STIL, ANLEITUNG]
  if (lektionen.length) parts.push(`Gelernt (neueste zuerst, bei Widerspruch gilt die neuere):\n${formatLektionen(lektionen.slice(0, 20))}`)
  if (videos.length) parts.push(`Bisherige Videos (nicht wiederholen):\n${formatVideos(videos.slice(0, 8))}`)
  return parts.join('\n\n')
}
