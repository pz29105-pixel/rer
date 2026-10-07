import { expect, test } from 'claude-code/testing'
import { classify, detectTestCommand, isCodeChange } from './detect.ts'

test('erkennt den Testbefehl am Projekt', async () => {
  const pkg = JSON.stringify({ scripts: { test: 'vitest run' } })
  expect(detectTestCommand({ names: ['package.json'], packageJson: pkg })).toEqual(['npm', 'test', '--silent'])
  expect(detectTestCommand({ names: ['package.json', 'pnpm-lock.yaml'], packageJson: pkg })).toEqual(['pnpm', 'test'])
  expect(detectTestCommand({ names: ['pyproject.toml', 'src'] })).toEqual(['python3', '-m', 'pytest', '-q', '-x'])
  expect(detectTestCommand({ names: ['go.mod'] })).toEqual(['go', 'test', './...'])
  expect(detectTestCommand({ names: ['Makefile'], makefile: 'build:\n\tcc x.c\ntest:\n\t./run' })).toEqual(['make', 'test'])

  const npmDefault = JSON.stringify({ scripts: { test: 'echo "Error: no test specified" && exit 1' } })
  expect(detectTestCommand({ names: ['package.json'], packageJson: npmDefault })).toBe(undefined)
  expect(detectTestCommand({ names: ['README.md'] })).toBe(undefined)
})

test('ordnet Ergebnisse ein und erkennt Code-Änderungen', async () => {
  const pytest = ['python3', '-m', 'pytest']
  expect(classify(pytest, 0, '')).toBe('passed')
  expect(classify(pytest, 1, 'FAILED test_x.py')).toBe('failed')
  expect(classify(pytest, 5, 'no tests ran')).toBe('missing')
  expect(classify(pytest, 1, 'No module named pytest')).toBe('missing')

  expect(isCodeChange('/p/src/app.ts')).toBe(true)
  expect(isCodeChange('/p/README.md')).toBe(false)
})
