import type { EngineInterface, Register } from 'claude-code'
import {
  HOCH, INSTRUCTION, QUER, concatArgs, concatList, parseArgs, parseDuration, parseScenes, sceneArgs, sceneSeconds, slugify, srt, wrapText,
} from './logic.ts'
import type { Format } from './logic.ts'

const TOOL = 'mcp__text-zu-video__video_rendern'

async function available($: EngineInterface, argv: string[]) {
  try {
    return (await $.process.run(argv, { timeoutMs: 10_000 })).exitCode === 0
  } catch {
    return false
  }
}

// Sprachausgabe über espeak-ng; ohne das Tool bleibt das Video stumm.
async function speak($: EngineInterface, text: string, wav: string): Promise<number | undefined> {
  try {
    const said = await $.process.run(['espeak-ng', '-v', 'de', '-s', '150', '-w', wav, text], { timeoutMs: 60_000 })
    if (said.exitCode !== 0) return undefined
    const probe = await $.process.run(
      ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', wav],
      { timeoutMs: 15_000 },
    )
    return parseDuration(probe.stdout)
  } catch {
    return undefined
  }
}

async function findFont($: EngineInterface): Promise<string | undefined> {
  try {
    const r = await $.process.run(['fc-match', '-f', '%{file}', 'sans:bold'], { timeoutMs: 10_000 })
    const file = r.stdout.trim()
    return r.exitCode === 0 && file.startsWith('/') ? file : undefined
  } catch {
    return undefined
  }
}

type RenderInput = { titel?: unknown; szenen?: unknown; quer?: unknown }

async function render($: EngineInterface, input: RenderInput): Promise<{ text: string; isError?: true }> {
  const { scenes, error } = parseScenes(input)
  if (error) return { text: `Video nicht erstellt: ${error}`, isError: true }
  if (!(await available($, ['ffmpeg', '-version']))) {
    return { text: 'Video nicht erstellt: ffmpeg ist nicht installiert. Bitte ffmpeg installieren (z. B. "apt install ffmpeg" oder "brew install ffmpeg") und /video erneut ausführen.', isError: true }
  }
  const format: Format = input.quer === true ? QUER : HOCH
  const title = typeof input.titel === 'string' && input.titel.trim() ? input.titel.trim() : scenes[0]!.schlagwort || 'video'
  const slug = slugify(title)
  const cwd = (await $.process.run(['pwd'])).stdout.trim()
  const outDir = `${cwd}/videos`
  const work = `${outDir}/.tmp-${slug}`
  const out = `${outDir}/${slug}.mp4`

  const hasVoice = await available($, ['espeak-ng', '--version'])
  const fontFile = await findFont($)
  const bodyChars = format.name === 'hoch' ? 20 : 38
  const titleChars = format.name === 'hoch' ? 14 : 26
  $.ui.status(`Video wird erstellt (${scenes.length} Szenen) …`)

  try {
    const parts: string[] = []
    const durations: number[] = []
    let voiced = 0
    for (const [i, scene] of scenes.entries()) {
      const n = String(i + 1).padStart(2, '0')
      const bodyFile = `${work}/${n}-text.txt`
      const titleFile = `${work}/${n}-titel.txt`
      await $.fs.write(bodyFile, wrapText(scene.text, bodyChars).join('\n'))
      if (scene.schlagwort) await $.fs.write(titleFile, wrapText(scene.schlagwort, titleChars).join('\n'))
      let audio: string | undefined
      let spoken: number | undefined
      if (hasVoice) {
        const wav = `${work}/${n}.wav`
        spoken = await speak($, scene.sprechertext, wav)
        if (spoken) {
          audio = wav
          voiced++
        }
      }
      const seconds = sceneSeconds(spoken, scene.sprechertext)
      const part = `${work}/${n}.mp4`
      const r = await $.process.run(
        sceneArgs(format, i, seconds, { bodyFile, titleFile: scene.schlagwort ? titleFile : undefined, audio, fontFile, out: part }),
        { timeoutMs: 300_000 },
      )
      if (r.exitCode !== 0) return { text: `Video nicht erstellt: ffmpeg scheiterte bei Szene ${i + 1}.\n${r.stderr.slice(-1500)}`, isError: true }
      parts.push(part)
      durations.push(seconds)
    }
    const list = `${work}/liste.txt`
    await $.fs.write(list, concatList(parts))
    const joined = await $.process.run(concatArgs(list, out), { timeoutMs: 300_000 })
    if (joined.exitCode !== 0) return { text: `Video nicht erstellt: Zusammenfügen scheiterte.\n${joined.stderr.slice(-1500)}`, isError: true }
    await $.fs.write(`${outDir}/${slug}.srt`, srt(scenes, durations))
    const total = durations.reduce((a, b) => a + b, 0)
    $.ui.status(`Video fertig: videos/${slug}.mp4`)
    const voice = voiced === scenes.length ? 'mit Stimme' : hasVoice ? `Stimme nur in ${voiced} von ${scenes.length} Szenen` : 'ohne Stimme (espeak-ng fehlt, Untertitel in der .srt-Datei)'
    return { text: `Video fertig: ${out}\n${scenes.length} Szenen, ${total} Sekunden, ${format.width}x${format.height}, ${voice}.\nUntertitel: ${outDir}/${slug}.srt` }
  } finally {
    try {
      await $.process.run(['rm', '-rf', work])
    } catch {
      // Aufräumen ist nur Kosmetik.
    }
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'video',
      description: 'Macht aus einem Thema oder Text ein Erklärvideo (MP4, hochkant; mit --quer im Querformat).',
      argumentHint: '[--quer] <Thema oder Text>',
    })
    await $.tool.register({
      name: 'video_rendern',
      description: 'Rendert ein Erklärvideo (MP4) aus Szenen: Textkarten auf Farbverlauf, deutsche Sprecherstimme falls verfügbar. Speichert nach ./videos/.',
      isDeferred: false,
      inputSchema: {
        type: 'object',
        properties: {
          titel: { type: 'string', description: 'Titel, wird zum Dateinamen' },
          quer: { type: 'boolean', description: 'true: Querformat 1920x1080, sonst hochkant 1080x1920' },
          szenen: {
            type: 'array',
            description: '4 bis 10 Szenen',
            items: {
              type: 'object',
              properties: {
                schlagwort: { type: 'string', description: '1 bis 3 Wörter, groß' },
                text: { type: 'string', description: 'Eingeblendeter Text, höchstens 12 Wörter' },
                sprechertext: { type: 'string', description: 'Gesprochener deutscher Text, 1 bis 2 Sätze' },
              },
              required: ['text', 'sprechertext'],
            },
          },
        },
        required: ['titel', 'szenen'],
      },
    })
    return next(e)
  })

  on('tool.call', { tool: TOOL }, async ($, e) => {
    const r = await render($, e as unknown as RenderInput)
    return r.isError ? { result: r.text, isError: true as const } : { result: r.text }
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'video' }, async (_$, e) => {
    const { quer, thema } = parseArgs(e.args)
    if (!thema) return { text: 'Verwendung: /video [--quer] <Thema oder Text>' }
    return {
      text: `Video wird vorbereitet: ${thema}`,
      context: [`${INSTRUCTION}\n\nFormat: ${quer ? 'quer (quer: true)' : 'hochkant'}.\nThema/Text des Nutzers:\n${thema}`],
    }
  })
}
