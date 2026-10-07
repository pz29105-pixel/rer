import { expect, test } from 'claude-code/testing'
import { scanDesign } from './rules.ts'

const rules = (path: string, text: string) => scanDesign(path, text).map(f => f.rule)

test('erkennt typische 08/15-Muster', async () => {
  expect(rules('a.css', 'body { font-family: Inter, sans-serif; }')).toContain('standard-schrift')
  expect(rules('a.css', '.hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }')).toContain('ki-verlauf')
  expect(rules('a.tsx', '<div className="bg-gradient-to-r from-purple-500 to-blue-500">')).toContain('ki-verlauf')
  expect(rules('a.tsx', '<button className="bg-indigo-600">')).toContain('tailwind-indigo')
  expect(rules('a.html', '<h1>Welcome to Acme</h1>')).toContain('floskel-text')
  expect(rules('a.html', '<span class="icon">🚀</span>')).toContain('emoji-icons')
  expect(rules('a.tsx', 'rounded-xl shadow-lg '.repeat(5))).toContain('einheits-karten')
})

test('lässt eigenständiges Design und Nicht-UI-Dateien in Ruhe', async () => {
  const css = ':root { --ink: #1a1410; --signal: #ff4f00; }\nh1 { font-family: "Fraunces", serif; letter-spacing: -0.03em; }'
  expect(scanDesign('a.css', css)).toEqual([])
  expect(scanDesign('notes.md', 'Welcome to font-family: Inter')).toEqual([])
  expect(scanDesign('a.css', 'body { font-family: Inter; } /* design-ok */')).toEqual([])
})

test('meldet Muster nach einem Write zurück, aber pro Regel nur einmal', async ($, on) => {
  on('tool.call', { tool: 'Write' }, (_, e) => ({
    result: { type: 'create', filePath: e.file_path, content: e.content, structuredPatch: [], originalFile: null },
  }))
  const html = '<h1 style="font-family: Roboto">Welcome to Acme</h1>'

  const first = await $.tool.call({ tool: 'Write', file_path: '/tmp/index.html', content: html })
  const note = first.context?.join('\n') ?? ''
  expect(note).toContain('standard-schrift')
  expect(note).toContain('floskel-text')

  const second = await $.tool.call({ tool: 'Write', file_path: '/tmp/index.html', content: html })
  expect(second.context ?? []).toEqual([])
})
