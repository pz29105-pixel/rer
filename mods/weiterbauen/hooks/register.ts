import type { Register } from 'claude-code'
import { MAX_ROUNDS, isDone, nextPrompt, parseArg } from './logic.ts'

let goal: string | undefined
let rounds = 0

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'dauerbau',
      description: 'Claude baut selbstständig am Ziel weiter. Ohne Text: Stand zeigen. "aus": beenden.',
      argumentHint: '[Ziel | aus]',
    })
    return next(e)
  })

  on('command.run', { command: 'dauerbau' }, async ($, e) => {
    const p = parseArg(e.args)
    if (p.kind === 'off') {
      goal = undefined
      rounds = 0
      $.ui.status(undefined)
      return { text: 'Dauerbau beendet.' }
    }
    if (p.kind === 'goal') {
      goal = p.goal
      rounds = 0
      $.ui.status('Dauerbau aktiv')
      return { text: `Dauerbau aktiv: ${goal}\nClaude erstellt nach jeder Antwort bis zu ${MAX_ROUNDS} Folgeschritte.` }
    }
    return { text: goal ? `Dauerbau aktiv: ${goal} (Runde ${rounds}/${MAX_ROUNDS})` : 'Dauerbau ist aus. Mit /dauerbau <Ziel> starten.' }
  })

  on('classic.Stop', async ($, e, next) => {
    if (!goal || e.agent_id) return next(e)
    if (!e.stop_hook_active) rounds = 0
    if (rounds >= MAX_ROUNDS || isDone(e.last_assistant_message ?? '')) {
      $.ui.status(undefined)
      $.ui.toast(`Dauerbau pausiert nach ${rounds} Runden.`)
      goal = undefined
      rounds = 0
      return next(e)
    }
    rounds++
    $.ui.status(`Dauerbau ${rounds}/${MAX_ROUNDS}`)
    return { block: nextPrompt(goal, rounds) }
  }).catch(($, e, next) => next(e))
}
