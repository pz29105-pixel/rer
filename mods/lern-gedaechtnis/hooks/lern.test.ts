import { expect, mock, test } from 'claude-code/testing'
import { addRule, mergeRules, removeRule } from './rules.ts'

test('Regeln: neu vorne, Dubletten aufgefrischt, löschen nach Nummer', async () => {
  let { rules, isNew } = addRule([], 'Antworte immer auf Deutsch.', 't1')
  expect(isNew).toBe(true)
  ;({ rules } = addRule(rules, 'Nutze pnpm statt npm', 't2'))
  ;({ rules, isNew } = addRule(rules, '  antworte IMMER auf deutsch ', 't3'))
  expect(isNew).toBe(false)
  expect(rules.map(r => r.text)).toEqual(['antworte IMMER auf deutsch', 'Nutze pnpm statt npm'])

  const { rules: left, removed } = removeRule(rules, 2)
  expect(removed?.text).toBe('Nutze pnpm statt npm')
  expect(left.length).toBe(1)
  expect(removeRule(rules, 9).removed).toBe(undefined)
})

test('das Werkzeug speichert eine Regel, die danach im System-Prompt steht', async ($, on) => {
  mock.store(on)
  on('prompt.compose', () => ({ sections: [] }))

  await $.tool.call({ tool: 'mcp__lern-gedaechtnis__regel_merken', regel: 'Frag vor großen Umbauten nach.' })

  const { sections } = await $.prompt.compose({ model: 'm', promptModel: 'm', surfaces: [], tools: [], outputStyle: null, traits: [] })
  const text = sections.find(s => s.id === 'lern-gedaechtnis:regeln')?.text ?? ''
  expect(text).toContain('1. Frag vor großen Umbauten nach.')
})

test('Regeln von Rechner und Projekt werden ohne Dubletten zusammengeführt', async () => {
  const local = [{ text: 'Antworte auf Deutsch', created: '2026-01-01' }]
  const project = [
    { text: 'antworte auf deutsch', created: '2026-02-01' },
    { text: 'Nutze pnpm', created: '2026-01-15' },
  ]
  expect(mergeRules(local, project).map(r => r.text)).toEqual(['antworte auf deutsch', 'Nutze pnpm'])
})
