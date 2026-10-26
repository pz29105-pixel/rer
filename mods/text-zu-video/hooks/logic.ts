// Reine Logik des Video-Mods: Szenen prüfen, Text umbrechen, Zeiten und ffmpeg-Argumente bauen.

export type Scene = { schlagwort: string; text: string; sprechertext: string }
export type Format = { width: number; height: number; name: 'hoch' | 'quer' }

export const HOCH: Format = { width: 1080, height: 1920, name: 'hoch' }
export const QUER: Format = { width: 1920, height: 1080, name: 'quer' }

const MAX_SCENES = 30
const MIN_SECONDS = 3
const MAX_SECONDS = 25
// Gesprochene Wörter pro Sekunde (Deutsch, ruhiges Tempo).
const WORDS_PER_SECOND = 2.5

// Farbverläufe je Szene: [Farbe 1, Farbe 2], ohne '#'.
const PALETTE: [string, string][] = [
  ['1b2a41', '324a5f'],
  ['3d1f2b', '8c2f39'],
  ['10332e', '2a6f60'],
  ['2d2a4a', '5b4b8a'],
  ['3a2a12', 'a0621a'],
  ['1c1c1c', '4a4a4a'],
]

export function parseArgs(args: string): { quer: boolean; thema: string } {
  const quer = /(^|\s)--quer(\s|$)/.test(args)
  return { quer, thema: args.replace(/(^|\s)--quer(?=\s|$)/g, ' ').trim() }
}

export function parseScenes(input: unknown): { scenes: Scene[]; error?: string } {
  const list = (input as { szenen?: unknown } | undefined)?.szenen
  if (!Array.isArray(list) || list.length === 0) return { scenes: [], error: 'Keine Szenen angegeben.' }
  if (list.length > MAX_SCENES) return { scenes: [], error: `Zu viele Szenen (${list.length}), höchstens ${MAX_SCENES}.` }
  const scenes: Scene[] = []
  for (const [i, raw] of list.entries()) {
    const r = raw as Partial<Scene> | null
    const text = typeof r?.text === 'string' ? r.text.trim() : ''
    const sprechertext = typeof r?.sprechertext === 'string' ? r.sprechertext.trim() : ''
    const schlagwort = typeof r?.schlagwort === 'string' ? r.schlagwort.trim() : ''
    if (!text && !sprechertext) return { scenes: [], error: `Szene ${i + 1} hat weder Text noch Sprechertext.` }
    scenes.push({ schlagwort, text: text || sprechertext, sprechertext: sprechertext || text })
  }
  return { scenes }
}

export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
  return slug || 'video'
}

// Bricht Text in Zeilen von höchstens `maxChars` Zeichen um (Wörter bleiben ganz).
export function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > maxChars) {
      lines.push(line)
      line = word
    } else {
      line = line ? `${line} ${word}` : word
    }
  }
  if (line) lines.push(line)
  return lines
}

export function estimateSeconds(sprechertext: string): number {
  const words = sprechertext.split(/\s+/).filter(Boolean).length
  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.ceil(words / WORDS_PER_SECOND) + 1))
}

export function sceneSeconds(spokenSeconds: number | undefined, sprechertext: string): number {
  if (spokenSeconds && spokenSeconds > 0) return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.ceil(spokenSeconds) + 1))
  return estimateSeconds(sprechertext)
}

export function gradientColors(index: number): [string, string] {
  return PALETTE[index % PALETTE.length]!
}

// Dauer einer WAV-Datei in Sekunden aus dem ffprobe-Ausdruck; undefined, wenn nicht lesbar.
export function parseDuration(out: string): number | undefined {
  const n = Number.parseFloat(out.trim())
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export type SceneFiles = { titleFile?: string; bodyFile: string; audio?: string; fontFile?: string; out: string }

// ffmpeg-Argumente für eine Szene: Verlauf, Schlagwort, Text, optional Ton.
export function sceneArgs(format: Format, index: number, seconds: number, f: SceneFiles): string[] {
  const [c0, c1] = gradientColors(index)
  const { width: w, height: h } = format
  const font = f.fontFile ? `fontfile=${f.fontFile}:` : ''
  const titleSize = Math.round(w * 0.075)
  const bodySize = Math.round(w * 0.055)
  const filters: string[] = []
  if (f.titleFile) {
    filters.push(
      `drawtext=${font}expansion=none:textfile=${f.titleFile}:fontsize=${titleSize}:fontcolor=0xffd479:x=(w-text_w)/2:y=h*0.18:line_spacing=12`,
    )
  }
  filters.push(
    `drawtext=${font}expansion=none:textfile=${f.bodyFile}:fontsize=${bodySize}:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:line_spacing=18:box=0:shadowcolor=black@0.5:shadowx=2:shadowy=2`,
  )
  const args = [
    'ffmpeg', '-y', '-loglevel', 'error',
    '-f', 'lavfi', '-i', `gradients=s=${w}x${h}:c0=0x${c0}:c1=0x${c1}:x0=0:y0=0:x1=${Math.round(w * 0.4)}:y1=${h}:d=${seconds}:r=30`,
  ]
  if (f.audio) args.push('-i', f.audio)
  else args.push('-f', 'lavfi', '-i', `anullsrc=r=44100:cl=stereo:d=${seconds}`)
  args.push(
    '-vf', filters.join(','),
    '-t', String(seconds),
    '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-r', '30',
    '-c:a', 'aac', '-ar', '44100', '-ac', '2', '-af', 'apad',
    f.out,
  )
  return args
}

export function concatList(files: string[]): string {
  return files.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n') + '\n'
}

export function concatArgs(listFile: string, out: string): string[] {
  return ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', '-movflags', '+faststart', out]
}

function srtTime(sec: number): string {
  const ms = Math.round(sec * 1000)
  const p = (n: number, l = 2) => String(n).padStart(l, '0')
  return `${p(Math.floor(ms / 3_600_000))}:${p(Math.floor(ms / 60_000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`
}

export function srt(scenes: Scene[], durations: number[]): string {
  let t = 0
  return scenes
    .map((s, i) => {
      const start = t
      t += durations[i]!
      return `${i + 1}\n${srtTime(start)} --> ${srtTime(t)}\n${s.sprechertext}\n`
    })
    .join('\n')
}

export const INSTRUCTION =
  'Der Nutzer will ein Erklärvideo. Zerlege das Thema in 4 bis 10 Szenen und rufe dann das Werkzeug ' +
  'mcp__text-zu-video__video_rendern auf (lade es vorher über ToolSearch, falls nötig). Pro Szene: ' +
  '"schlagwort" (1 bis 3 Wörter, wird groß gezeigt), "text" (höchstens 12 Wörter, wird eingeblendet) und ' +
  '"sprechertext" (1 bis 2 ganze Sätze auf Deutsch, wird gesprochen). Setze außerdem "titel". ' +
  'Erfinde keine Fakten; nutze, was der Nutzer geliefert hat, oder gesichertes Wissen. ' +
  'Melde danach Pfad und Länge des Videos und ob eine Stimme verwendet wurde.'
