import { expect, test } from 'claude-code/testing'
import { classify, cost, decide } from './logic.ts'

test('ordnet Aufgaben ein', async () => {
  expect(classify('Ja')).toBe('keep')
  expect(classify('mach weiter')).toBe('keep')
  expect(classify('Was bedeutet HTTP 418?')).toBe('trivial')
  expect(classify('Danke!')).toBe('trivial')
  expect(classify('Kannst du einen Mod erstellen, der Tokens spart?')).toBe('hard')
  expect(classify('Warum funktioniert der Login nicht mehr?')).toBe('hard')
  expect(classify('Traceback (most recent call last):\n  File "a.py"')).toBe('hard')
  expect(classify('Füge im Footer einen Link zum Impressum hinzu')).toBe('normal')
})

test('schaltet nur um, wenn es sich trotz Cache lohnt', async () => {
  // schwere Aufgabe: hoch, auch bei großem Kontext
  expect(decide({ mode: 'ausgewogen', taskClass: 'hard', current: 'medium', contextTokens: 80_000 })).toEqual(
    expect.objectContaining({ effort: 'high', isSwitch: true }),
  )
  // leichte Aufgabe, kleiner Kontext: runter
  expect(decide({ mode: 'ausgewogen', taskClass: 'trivial', current: 'medium', contextTokens: 5_000 }).effort).toBe('low')
  // leichte Aufgabe, großer Kontext: bleibt, weil Neu-Einlesen teurer wäre
  const kept = decide({ mode: 'ausgewogen', taskClass: 'trivial', current: 'high', contextTokens: 60_000 })
  expect(kept.isSwitch).toBe(false)
  expect(kept.effort).toBe('high')
  // Bestätigung und Modus aus: nichts ändern
  expect(decide({ mode: 'ausgewogen', taskClass: 'keep', current: 'high', contextTokens: 0 }).isSwitch).toBe(false)
  expect(decide({ mode: 'aus', taskClass: 'hard', current: 'low', contextTokens: 0 }).isSwitch).toBe(false)
  // Sparmodus: bei riesigem Kontext auch nicht hochschalten
  expect(decide({ mode: 'sparsam', taskClass: 'hard', current: 'low', contextTokens: 300_000 }).isSwitch).toBe(false)
})

test('rechnet Kosten mit Cache-Preisen', async () => {
  const usage = { input_tokens: 1_000, output_tokens: 2_000, cache_read_input_tokens: 100_000, cache_creation_input_tokens: 0 }
  // Opus 5.5: 1k×4 + 100k×0,20 + 2k×20 = 0,004 + 0,02 + 0,04 $
  expect(Math.round((cost(usage, 'claude-opus-5-5') ?? 0) * 1e6)).toBe(64_000)
  expect(cost(usage, 'unbekannt')).toBe(undefined)
})
