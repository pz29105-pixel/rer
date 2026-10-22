import { expect, mock, test } from 'claude-code/testing'
import { EMOJI, bar, hitRate, levelOf, minutesLeft, remainingRatio, resolveTtl, splitSummary, thresholdOf, weatherOf } from './logic.ts'

test('Restzeit, Balken und Farbe laufen mit der Zeit leer', () => {
  const min = 60_000
  expect(remainingRatio(0, 0, '5m')).toBe(1)
  expect(minutesLeft(remainingRatio(0, 1 * min, '5m'), '5m')).toBe(4)
  expect(remainingRatio(0, 10 * min, '5m')).toBe(0)
  expect(minutesLeft(remainingRatio(0, 30 * min, '1h'), '1h')).toBe(30)

  const full = bar(1)
  expect(full.filled.length).toBe(20)
  expect(bar(0.5).filled.length).toBe(10)
  expect(bar(0.5).empty.length).toBe(10)
  expect(bar(0).filled).toBe('')

  expect(levelOf(1)).toBe('green')
  expect(levelOf(0.26)).toBe('green')
  expect(levelOf(0.25)).toBe('yellow')
  expect(levelOf(0.11)).toBe('yellow')
  expect(levelOf(0.1)).toBe('red')
  expect(levelOf(0)).toBe('expired')
})

test('Cache-Laufzeit: Einstellung vor Sitzung vor Umgebung', () => {
  expect(resolveTtl('1h', '5m', undefined, undefined)).toBe('1h')
  expect(resolveTtl('auto', '1h', undefined, undefined)).toBe('1h')
  expect(resolveTtl('auto', null, '1', undefined)).toBe('1h')
  expect(resolveTtl('auto', null, '1', '1')).toBe('5m')
  expect(resolveTtl(undefined, null, undefined, undefined)).toBe('5m')
})

test('Cache-Quote und Wetter', () => {
  expect(hitRate({ input_tokens: 100, cache_read_input_tokens: 900, cache_creation_input_tokens: 0 })).toBe(90)
  expect(hitRate({ input_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 })).toBe(undefined)

  expect(thresholdOf(200_000, 160_000)).toBe(160_000)
  expect(thresholdOf(200_000, undefined)).toBe(166_000)

  expect(weatherOf(50_000, 100_000)).toBe('sun')
  expect(weatherOf(50_001, 100_000)).toBe('rain')
  expect(weatherOf(80_000, 100_000)).toBe('rain')
  expect(weatherOf(80_001, 100_000)).toBe('storm')
  expect(EMOJI.storm).toBe('⛈️')
})

test('lange Zusammenfassungen werden an Absätzen geteilt', () => {
  const para = (c: string) => c.repeat(700)
  const parts = splitSummary(`${para('a')}\n\n${para('b')}\n\n${para('c')}`, 1800)
  expect(parts.length).toBe(2)
  expect(parts.every(p => p.length <= 1800)).toBe(true)
  expect(parts.join('\n\n')).toContain(para('c'))

  const huge = splitSummary('wort '.repeat(1000), 1800)
  expect(huge.every(p => p.length <= 1800)).toBe(true)
  expect(huge.length).toBeGreaterThan(1)
  expect(splitSummary('kurz')).toEqual(['kurz'])
})

test('ein Compact schreibt Tokens und Zusammenfassung ins Log', async ($, on) => {
  const lines: string[] = []
  on('ui.log', (_, e) => {
    lines.push(e.text)
    return { value: undefined }
  })
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200_000 }, rateLimits: [] } }))
  on('session.compact', () => ({ messages: [{ role: 'user', text: 'Zusammenfassung', toolUses: [] }], tokensBefore: 120_000, tokensAfter: 8_000 }))

  await $.session.compact({ trigger: 'manual', messages: [{ role: 'user', text: 'alt', toolUses: [] }] })

  expect(lines[0]).toBe('Compact: Kontext 120k → 8k Tokens')
  expect(lines[1]).toBe('Zusammenfassung')
})

const BAND = (isWorking: boolean) =>
  ({ plugin: 'cache-wetter', component: 'AbovePrompt', props: { hasSurvey: false, isWorking, maxRows: 10, bodyColumns: 120, scroll: { offset: 0, bodyRows: 10 }, view: {} } }) as const

test('Compact wird bei laufender Antwort und in der Desktop-App eingereiht', async ($, on) => {
  mock.clock(on)
  mock.env(on, {})
  const sent: string[] = []
  on('command.run', (_, e) => {
    sent.push(`/${e.command}`)
    return { text: '' }
  })
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200_000, tokens: 190_000, percent: 95 }, rateLimits: [] } }))
  on('session.compact', () => ({ skip: 'test' }))

  for (const [surface, isWorking] of [['terminal', true], ['desktop', false]] as const) {
    sent.length = 0
    const ui = await $.ui.mount({ ...BAND(isWorking), surface })
    expect(await ui.find({ type: 'Text', text: /Kontext/ })).toBeTruthy()
    await ui.press({ key: 'compact' })
    expect(sent).toEqual(['/compact'])
    await ui.unmount()
  }
})

test('zugeklappt bleiben Wetter, Cache-Restzeit und Kontext', async ($, on) => {
  mock.clock(on)
  mock.env(on, {})
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200_000, tokens: 10_000, percent: 5 }, rateLimits: [] } }))
  const ui = await $.ui.mount({ ...BAND(false), surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Treffer/ })).toBeTruthy()
  await ui.press({ key: 'collapse' })
  expect(await ui.find({ type: 'Text', text: /Treffer/ })).toBeFalsy()
  expect(await ui.find({ type: 'Text', text: /Kontext/ })).toBeTruthy()
  await ui.unmount()
})
