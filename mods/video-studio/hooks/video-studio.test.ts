import { expect, mock, test } from 'claude-code/testing'
import { addLektion, addVideo, buildSection, mergeLektionen, mergeVideos, removeLektion, setErgebnis } from './logic.ts'

test('Lektionen: neu vorne, Dubletten aufgefrischt, löschen nach Nummer', () => {
  let { list, isNew } = addLektion([], 'Hooks unter 12 Wörtern.', 'regel', 't1')
  expect(isNew).toBe(true)
  ;({ list } = addLektion(list, 'Zu viele Gäste im Bild', 'schlecht', 't2'))
  ;({ list, isNew } = addLektion(list, ' hooks UNTER 12 wörtern ', 'gut', 't3'))
  expect(isNew).toBe(false)
  expect(list.map(l => l.art)).toEqual(['gut', 'schlecht'])
  const { list: left, removed } = removeLektion(list, 2)
  expect(removed?.text).toBe('Zu viele Gäste im Bild')
  expect(left.length).toBe(1)
  expect(removeLektion(list, 9).removed).toBe(undefined)
})

test('Videos: Ergebnis bleibt beim Auffrischen, Abschnitt bleibt kurz', () => {
  let videos = addVideo([], 'The Gardener', 'My family called my husband a nobody.', 't1')
  videos = setErgebnis(videos, 1, '42k Aufrufe').list
  videos = addVideo(videos, 'the gardener', 'New hook', 't2')
  expect(videos).toHaveLength(1)
  expect(videos[0]!.ergebnis).toBe('42k Aufrufe')
  expect(setErgebnis(videos, 5, 'x').video).toBe(undefined)
  const text = buildSection(addLektion([], 'Kurze Hooks', 'gut', 't1').list, videos)
  expect(text).toContain('[Gut] Kurze Hooks')
  expect(text).toContain('Ergebnis: 42k Aufrufe')
  expect(text.length).toBeLessThan(3500)
})

test('Zusammenführen von Rechner und Projekt ohne Dubletten', () => {
  expect(
    mergeLektionen(
      [{ text: 'Kurze Hooks', art: 'gut', created: '2026-01-01' }],
      [{ text: 'kurze hooks', art: 'gut', created: '2026-02-01' }, { text: 'Mehr Details', art: 'regel', created: '2026-01-15' }],
    ).map(l => l.text),
  ).toEqual(['kurze hooks', 'Mehr Details'])
  const m = mergeVideos([{ titel: 'A', hook: 'h', created: '2026-01-01', ergebnis: '1k' }], [{ titel: 'a', hook: 'h2', created: '2026-02-01' }])
  expect(m).toHaveLength(1)
  expect(m[0]!.ergebnis).toBe('1k')
})

test('Werkzeuge speichern Lektion, Video und Ergebnis; alles steht im System-Prompt', async ($, on) => {
  mock.store(on)
  on('prompt.compose', () => ({ sections: [] }))

  await $.tool.call({ tool: 'mcp__video-studio__video_lektion_merken', lektion: 'Hook in 10 Wörtern.', art: 'gut' })
  await $.tool.call({ tool: 'mcp__video-studio__video_festhalten', titel: 'The Gardener', hook: 'My family called my husband a nobody.' })
  await $.tool.call({ tool: 'mcp__video-studio__video_ergebnis', nr: 1, ergebnis: '42k Aufrufe' })

  const { sections } = await $.prompt.compose({ model: 'm', promptModel: 'm', surfaces: [], tools: [], outputStyle: null, traits: [] })
  const text = sections.find(s => s.id === 'video-studio:stil')?.text ?? ''
  expect(text).toContain('[Gut] Hook in 10 Wörtern.')
  expect(text).toContain('The Gardener')
  expect(text).toContain('Ergebnis: 42k Aufrufe')
})
