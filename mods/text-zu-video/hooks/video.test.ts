import { expect, test } from 'claude-code/testing'
import { HOCH, QUER, concatList, estimateSeconds, parseArgs, parseScenes, sceneArgs, sceneSeconds, slugify, srt, wrapText } from './logic.ts'

test('Argumente: --quer wird erkannt und entfernt', async () => {
  expect(parseArgs('--quer Wie Bienen leben')).toEqual({ quer: true, thema: 'Wie Bienen leben' })
  expect(parseArgs('  Wie Bienen leben ')).toEqual({ quer: false, thema: 'Wie Bienen leben' })
  expect(parseArgs('')).toEqual({ quer: false, thema: '' })
})

test('Szenen werden geprüft', async () => {
  expect(parseScenes({}).error).toContain('Keine Szenen')
  expect(parseScenes({ szenen: [{ schlagwort: 'a' }] }).error).toContain('Szene 1')
  const ok = parseScenes({ szenen: [{ schlagwort: 'Bienen', text: 'Sie tanzen', sprechertext: 'Bienen tanzen.' }, { text: 'Nur Text' }] })
  expect(ok.error).toBe(undefined)
  expect(ok.scenes[1]).toEqual({ schlagwort: '', text: 'Nur Text', sprechertext: 'Nur Text' })
  expect(parseScenes({ szenen: Array(31).fill({ text: 'x' }) }).error).toContain('Zu viele')
})

test('Dateiname, Umbruch und Zeiten', async () => {
  expect(slugify('Wie Bienen über Blüten tanzen!')).toBe('wie-bienen-ueber-blueten-tanzen')
  expect(slugify('???')).toBe('video')
  expect(wrapText('Ein sehr langer Satz mit vielen Wörtern', 12)).toEqual(['Ein sehr', 'langer Satz', 'mit vielen', 'Wörtern'])
  expect(estimateSeconds('eins')).toBe(3)
  expect(estimateSeconds(Array(500).fill('wort').join(' '))).toBe(25)
  expect(sceneSeconds(6.2, 'egal')).toBe(8)
  expect(sceneSeconds(undefined, 'eins zwei drei vier fünf')).toBe(3)
})

test('ffmpeg-Argumente: Format, Ton und Stille', async () => {
  const f = { bodyFile: '/w/t.txt', titleFile: '/w/k.txt', out: '/w/o.mp4' }
  const stumm = sceneArgs(HOCH, 0, 5, f).join(' ')
  expect(stumm).toContain('s=1080x1920')
  expect(stumm).toContain('anullsrc')
  expect(stumm).toContain('expansion=none:textfile=/w/t.txt')
  const laut = sceneArgs(QUER, 1, 5, { ...f, audio: '/w/a.wav', fontFile: '/f.ttf' }).join(' ')
  expect(laut).toContain('s=1920x1080')
  expect(laut).toContain('-i /w/a.wav')
  expect(laut).toContain('fontfile=/f.ttf')
  expect(laut).not.toContain('anullsrc')
})

test('Liste und Untertitel', async () => {
  expect(concatList(["/a/o'k.mp4"])).toBe("file '/a/o'\\''k.mp4'\n")
  const out = srt([{ schlagwort: '', text: 'a', sprechertext: 'Eins.' }, { schlagwort: '', text: 'b', sprechertext: 'Zwei.' }], [3, 4.5])
  expect(out).toContain('00:00:03,000 --> 00:00:07,500')
})

test('/video ohne Thema erklärt die Verwendung, mit Thema bekommt Claude den Auftrag', async ($, on) => {
  on('command.register', () => ({ value: { command: 'video' } }))
  on('tool.register', () => ({ value: { tool: 'mcp__text-zu-video__video_rendern' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const leer = await $.command.run({ command: 'video', args: '' })
  expect(leer.text).toContain('Verwendung')
  const ok = await $.command.run({ command: 'video', args: '--quer Bienen' })
  expect(ok.context?.join('\n')).toContain('quer: true')
  expect(ok.context?.join('\n')).toContain('Bienen')
})

test('Rendern: ohne ffmpeg klare Meldung, mit ffmpeg Video ohne Stimme', async ($, on) => {
  on('command.register', () => ({ value: { command: 'video' } }))
  on('tool.register', () => ({ value: { tool: 'mcp__text-zu-video__video_rendern' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.status', () => ({ value: undefined }))
  on('fs.write', () => ({ value: undefined }))
  const input = { titel: 'Bienen', szenen: [{ schlagwort: 'Tanz', text: 'Sie tanzen', sprechertext: 'Bienen tanzen.' }] }
  const calls: string[] = []
  let hasFfmpeg = false
  on('process.run', (_, e) => {
    const cmd = e.argv[0]!
    calls.push(cmd)
    if (cmd === 'pwd') return { value: { exitCode: 0, stdout: '/proj\n', stderr: '' } }
    if (cmd === 'ffmpeg' && e.argv[1] === '-version' && !hasFfmpeg) return { value: { exitCode: 127, stdout: '', stderr: 'nicht gefunden' } }
    if (cmd === 'espeak-ng') return { value: { exitCode: 127, stdout: '', stderr: '' } }
    return { value: { exitCode: 0, stdout: '', stderr: '' } }
  })

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const fehlt = await $.tool.call({ tool: 'mcp__text-zu-video__video_rendern', ...input })
  expect(JSON.stringify(fehlt)).toContain('ffmpeg ist nicht installiert')

  hasFfmpeg = true
  const ok = await $.tool.call({ tool: 'mcp__text-zu-video__video_rendern', ...input })
  expect(JSON.stringify(ok)).toContain('/proj/videos/bienen.mp4')
  expect(JSON.stringify(ok)).toContain('ohne Stimme')
  expect(calls).toContain('rm')
})
