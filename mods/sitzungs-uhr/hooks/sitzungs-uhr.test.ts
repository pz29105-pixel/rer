import { expect, mock, test } from 'claude-code/testing'
import { countUserMessages, formatCount, formatDuration, isOwnPrompt } from './logic.ts'

test('Laufzeit und Anzahl lesbar formatieren', () => {
  expect(formatDuration(0)).toBe('0 s')
  expect(formatDuration(45_000)).toBe('45 s')
  expect(formatDuration(7 * 60_000 + 20_000)).toBe('7 Min')
  expect(formatDuration(65 * 60_000)).toBe('1 Std 05 Min')
  expect(formatCount(1)).toBe('1 Nachricht')
  expect(formatCount(0)).toBe('0 Nachrichten')
  expect(formatCount(12)).toBe('12 Nachrichten')
})

test('zählt nur Nachrichten des Nutzers', () => {
  const messages = [
    { role: 'user', text: 'Hallo' },
    { role: 'assistant', text: 'Hi' },
    { role: 'user', text: '', toolResults: [{}] },
    { role: 'user', text: 'Weiter' },
  ]
  expect(countUserMessages(messages)).toBe(2)
  expect(isOwnPrompt('composer')).toBe(true)
  expect(isOwnPrompt('bridge')).toBe(true)
  expect(isOwnPrompt('task-notification')).toBe(false)
})

test('die Leiste zeigt Laufzeit und Nachrichten und zählt mit', async ($, on) => {
  const clock = mock.clock(on)
  const startedAt = clock.now()
  on('session.usage', () => ({ value: { startedAt, context: { window: 200_000 }, rateLimits: [] } }))
  on('session.messages', () => ({ value: [] }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => ({ text: e.text }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.prompt.submit({ text: 'eins' })
  await clock.advance(5 * 60_000)

  const ui = await $.ui.mount({
    plugin: 'sitzungs-uhr',
    component: 'AbovePrompt',
    surface: 'terminal',
    props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120, scroll: { offset: 0, bodyRows: 10 }, view: {} },
  })
  expect(await ui.find({ type: 'Text', text: /Sitzung 5 Min/ })).toBeTruthy()
  await ui.unmount()
})
