import type { EngineInterface, Register } from 'claude-code'
import {
  addLektion, addVideo, buildSection, formatLektionen, formatVideos, mergeLektionen, mergeVideos,
  parseLektionen, parseVideos, removeLektion, setErgebnis, STIL, type Art, type Lektion, type Video,
} from './logic.ts'

// Einstellungen liegen im Store (bleibt auf dem eigenen Rechner) und zusätzlich
// in einer Datei im Projekt (bleibt in Cloud-Sitzungen, sobald sie committet ist).
// Dieser Block ist in lern-gedaechtnis, design-eigenstil und spar-pilot gleich ($ darf nicht über Dateigrenzen gereicht werden).
const PROJECT_FILE = '.claude/mod-einstellungen.json'

let projectRoot: string | null | undefined

async function root($: EngineInterface) {
  if (projectRoot !== undefined) return projectRoot
  try {
    const r = await $.process.run(['git', 'rev-parse', '--show-toplevel'])
    projectRoot = r.exitCode === 0 ? r.stdout.trim() : null
  } catch {
    projectRoot = null
  }
  return projectRoot
}

async function readFile($: EngineInterface, dir: string): Promise<Record<string, unknown>> {
  try {
    const data: unknown = JSON.parse(await $.fs.read(`${dir}/${PROJECT_FILE}`))
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

// Wert aus der Projektdatei, sonst aus dem Store.
async function getSetting($: EngineInterface, key: string): Promise<unknown> {
  const dir = await root($)
  if (dir) {
    const data = await readFile($, dir)
    if (key in data) return data[key]
  }
  return $.store.get(key)
}

// Schreibt in Store und Projektdatei; `undefined` löscht. Antwortet, ob die Projektdatei geschrieben wurde.
async function setSetting($: EngineInterface, key: string, value: unknown): Promise<boolean> {
  if (value === undefined) await $.store.delete(key)
  else await $.store.set(key, value)
  const dir = await root($)
  if (!dir) return false
  try {
    const data = await readFile($, dir)
    if (value === undefined) delete data[key]
    else data[key] = value
    await $.fs.write(`${dir}/${PROJECT_FILE}`, JSON.stringify(data, null, 2) + '\n')
    return true
  } catch {
    return false
  }
}

const COMMIT_HINT = `Gespeichert in ${PROJECT_FILE} – beim nächsten Commit mit einchecken, damit es auch in Cloud-Sitzungen gilt.`
const hint = (inProject: boolean) => (inProject ? `\n${COMMIT_HINT}` : '')

const K_LEKTIONEN = 'video-lektionen'
const K_VIDEOS = 'video-liste'
const T_LEKTION = 'mcp__video-studio__video_lektion_merken'
const T_VIDEO = 'mcp__video-studio__video_festhalten'
const T_ERGEBNIS = 'mcp__video-studio__video_ergebnis'

const loadLektionen = async ($: EngineInterface): Promise<Lektion[]> =>
  mergeLektionen(parseLektionen(await $.store.get(K_LEKTIONEN)), parseLektionen(await getSetting($, K_LEKTIONEN)))
const loadVideos = async ($: EngineInterface): Promise<Video[]> =>
  mergeVideos(parseVideos(await $.store.get(K_VIDEOS)), parseVideos(await getSetting($, K_VIDEOS)))

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.tool.register({
      name: 'video_lektion_merken',
      description:
        'Speichert eine Lehre aus Feedback zu einem Video (Skript, Hook, Bild-Prompts, Stil). Gilt ab dann in allen Sitzungen. Nur für wiederkehrende Erkenntnisse, nicht für Details eines einzelnen Videos.',
      inputSchema: {
        type: 'object',
        properties: {
          lektion: { type: 'string', description: 'Kurze Anweisung an dich selbst, z. B. "Hooks unter 12 Wörtern halten."' },
          art: { type: 'string', enum: ['gut', 'schlecht', 'regel'], description: 'gut = hat funktioniert, schlecht = vermeiden, regel = neutrale Vorgabe' },
        },
        required: ['lektion', 'art'],
      },
    })
    await $.tool.register({
      name: 'video_festhalten',
      description: 'Trägt ein geliefertes Video-Paket in die Liste ein, damit Geschichten und Hooks sich nicht wiederholen.',
      inputSchema: {
        type: 'object',
        properties: {
          titel: { type: 'string', description: 'Kurzer Titel der Geschichte' },
          hook: { type: 'string', description: 'Der erste Satz des Skripts' },
        },
        required: ['titel', 'hook'],
      },
    })
    await $.tool.register({
      name: 'video_ergebnis',
      description: 'Hängt Ergebnis-Zahlen des Nutzers (Aufrufe, Likes, Watchtime) an ein Video aus der Liste.',
      inputSchema: {
        type: 'object',
        properties: {
          nr: { type: 'number', description: 'Nummer des Videos in der Liste (1 = neuestes)' },
          ergebnis: { type: 'string', description: 'z. B. "42k Aufrufe, 71 % Watchtime"' },
        },
        required: ['nr', 'ergebnis'],
      },
    })
    await $.command.register({ name: 'videostil', description: 'Zeigt den festen Video-Stil, alle Lektionen und die Videoliste.' })
    await $.command.register({ name: 'lektion', description: 'Fügt eine Lektion von Hand hinzu.', argumentHint: '<gut|schlecht|regel> <Text>' })
    await $.command.register({ name: 'lektion-loeschen', description: 'Löscht eine Lektion nach Nummer, oder alle mit "alle".', argumentHint: '<Nr | alle>' })
    await $.command.register({ name: 'videoergebnis', description: 'Trägt Ergebnis-Zahlen zu einem Video ein.', argumentHint: '<Nr> <Zahlen>' })
    return next(e)
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    const text = buildSection(await loadLektionen($), await loadVideos($))
    return { sections: [...composed.sections, { id: 'video-studio:stil', text, scope: 'session' }] }
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: T_LEKTION }, async ($, e) => {
    const { lektion, art } = e as { lektion?: unknown; art?: unknown }
    if (typeof lektion !== 'string' || !lektion.trim()) return { result: 'Keine Lektion angegeben.' }
    const { list, isNew } = addLektion(await loadLektionen($), lektion, art as Art, new Date().toISOString())
    const inProject = await setSetting($, K_LEKTIONEN, list)
    $.ui.toast(`Gelernt: ${list[0]!.text}`)
    return { result: (isNew ? `Lektion gespeichert (${list.length} insgesamt).` : 'Lektion war schon bekannt und wurde aufgefrischt.') + hint(inProject) }
  })

  on('tool.call', { tool: T_VIDEO }, async ($, e) => {
    const { titel, hook } = e as { titel?: unknown; hook?: unknown }
    if (typeof titel !== 'string' || !titel.trim() || typeof hook !== 'string') return { result: 'Titel und Hook fehlen.' }
    const list = addVideo(await loadVideos($), titel, hook, new Date().toISOString())
    const inProject = await setSetting($, K_VIDEOS, list)
    return { result: `Video eingetragen (${list.length} in der Liste).` + hint(inProject) }
  })

  on('tool.call', { tool: T_ERGEBNIS }, async ($, e) => {
    const { nr, ergebnis } = e as { nr?: unknown; ergebnis?: unknown }
    if (typeof nr !== 'number' || typeof ergebnis !== 'string' || !ergebnis.trim()) return { result: 'Nummer und Ergebnis fehlen.' }
    const { list, video } = setErgebnis(await loadVideos($), nr, ergebnis)
    if (!video) return { result: 'Kein Video mit dieser Nummer.' }
    const inProject = await setSetting($, K_VIDEOS, list)
    return { result: `Ergebnis gespeichert für "${video.titel}".` + hint(inProject) }
  })

  on('command.run', { command: 'videostil' }, async $ => {
    const lektionen = await loadLektionen($)
    const videos = await loadVideos($)
    return {
      text: [
        STIL,
        lektionen.length ? `Lektionen:\n${formatLektionen(lektionen)}` : 'Noch keine Lektionen gelernt.',
        videos.length ? `Videos:\n${formatVideos(videos)}` : 'Noch keine Videos in der Liste.',
      ].join('\n\n'),
    }
  })

  on('command.run', { command: 'lektion' }, async ($, e) => {
    const m = /^(gut|schlecht|regel)\s+(.+)$/is.exec(e.args.trim())
    if (!m) return { text: 'Bitte Art und Text mitgeben, z. B. /lektion schlecht Hooks mit mehr als 15 Wörtern.' }
    const { list } = addLektion(await loadLektionen($), m[2]!, m[1]!.toLowerCase() as Art, new Date().toISOString())
    const inProject = await setSetting($, K_LEKTIONEN, list)
    return { text: `Gelernt: ${list[0]!.text}${hint(inProject)}` }
  })

  on('command.run', { command: 'lektion-loeschen' }, async ($, e) => {
    const arg = e.args.trim()
    if (/^alle$/i.test(arg)) {
      const inProject = await setSetting($, K_LEKTIONEN, undefined)
      return { text: `Alle Lektionen gelöscht.${hint(inProject)}` }
    }
    const { list, removed } = removeLektion(await loadLektionen($), Number(arg))
    if (!removed) return { text: 'Keine Lektion mit dieser Nummer. /videostil zeigt die Liste.' }
    const inProject = await setSetting($, K_LEKTIONEN, list)
    return { text: `Gelöscht: ${removed.text}${hint(inProject)}` }
  })

  on('command.run', { command: 'videoergebnis' }, async ($, e) => {
    const m = /^(\d+)\s+(.+)$/s.exec(e.args.trim())
    if (!m) return { text: 'Bitte Nummer und Zahlen mitgeben, z. B. /videoergebnis 1 42k Aufrufe, 71 % Watchtime.' }
    const { list, video } = setErgebnis(await loadVideos($), Number(m[1]), m[2]!)
    if (!video) return { text: 'Kein Video mit dieser Nummer. /videostil zeigt die Liste.' }
    const inProject = await setSetting($, K_VIDEOS, list)
    return { text: `Ergebnis gespeichert für "${video.titel}".${hint(inProject)}` }
  })
}
