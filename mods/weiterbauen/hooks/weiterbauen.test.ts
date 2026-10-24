import { expect, test } from 'claude-code/testing'
import { MAX_ROUNDS, isDone, nextPrompt, parseArg } from './logic.ts'

test('parst Argumente und erkennt das Ende', async () => {
  expect(parseArg('')).toEqual({ kind: 'show' })
  expect(parseArg('aus')).toEqual({ kind: 'off' })
  expect(parseArg('Todo-App')).toEqual({ kind: 'goal', goal: 'Todo-App' })
  expect(isDone('Das Ziel ist vollständig erreicht.')).toBe(true)
  expect(isDone('Ich habe Datei A erstellt.')).toBe(false)
})

test('Aufforderung nennt Ziel und Runde', async () => {
  const t = nextPrompt('Todo-App', 2)
  expect(t).toContain('Todo-App')
  expect(t).toContain(`2 von ${MAX_ROUNDS}`)
})
