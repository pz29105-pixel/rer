import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { countUserMessages, formatCount, formatDuration, isOwnPrompt } from './logic.ts'

const count = atom({ plugin: 'sitzungs-uhr', key: 'count' } as const, 0)
const tick = atom({ plugin: 'sitzungs-uhr', key: 'tick' } as const, 0)

export const register: Register = on => {
  let timer: { cancel: () => void } | undefined

  on('session.start', async ($, e, next) => {
    timer?.cancel()
    timer = $.clock.every(60_000, () => {
      void update($, tick, n => n + 1)
    })
    try {
      // Eine fortgesetzte Sitzung hat schon Nachrichten.
      const n = countUserMessages(await $.session.messages())
      await update($, count, () => n)
    } catch {
      // Zählen ist nur Anzeige.
    }
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    if (isOwnPrompt(e.origin?.kind ?? 'composer')) await update($, count, n => n + 1)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    await read($, tick)
    const messages = await read($, count)
    const { startedAt } = await $.session.usage()
    const elapsed = (await $.clock.now()) - startedAt
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box gap={1}>
        <Text>Sitzung {formatDuration(elapsed)}</Text>
        <Text dimColor>│</Text>
        <Text>{formatCount(messages)}</Text>
      </Box>
    )
  })
}
