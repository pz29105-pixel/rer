import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { CacheInfo } from '../types'
import {
  EMOJI,
  bar,
  fmtTokens,
  hitRate,
  levelOf,
  minutesLeft,
  percent,
  remainingRatio,
  resolveTtl,
  splitSummary,
  thresholdOf,
  weatherOf,
} from './logic.ts'
import type { Ttl } from './logic.ts'

const info = atom({ plugin: 'cache-wetter', key: 'info' } as const, null)
const tick = atom({ plugin: 'cache-wetter', key: 'tick' } as const, 0)
const isCollapsed = atom({ plugin: 'cache-wetter', key: 'isCollapsed' } as const, false)
const seenTtl = atom({ plugin: 'cache-wetter', key: 'seenTtl' } as const, null)

const COLORS = { green: 'green', yellow: 'yellow', red: 'red', expired: 'red' } as const

let lastLogged = ''

// Liest Kontext und Cache-Quote der Sitzung neu ein. `isResponse`: gerade kam eine Antwort, der Cache-Zähler startet neu.
async function refresh($: EngineInterface, isResponse: boolean, isCompact = false) {
  try {
    await measure($, isResponse, isCompact)
  } catch {
    // Messen ist nur Anzeige: ein Fehler darf weder Antwort noch Compact stören.
  }
}

async function measure($: EngineInterface, isResponse: boolean, isCompact: boolean) {
  const now = await $.clock.now()
  const usage = await $.session.usage({ breakdown: 'summary' })
  const b = usage.context.breakdown
  const window = b?.rawMaxTokens ?? usage.context.window
  const tokens = isCompact ? b?.totalTokens : (usage.context.tokens ?? b?.totalTokens)
  const hit = b?.apiUsage && !isCompact ? hitRate(b.apiUsage) : undefined
  const threshold = b?.isAutoCompactEnabled === false ? undefined : b?.autoCompactThreshold

  await update($, info, (prev: CacheInfo | null): CacheInfo => ({
    lastAt: isCompact ? undefined : isResponse ? now : prev?.lastAt,
    hit: isCompact ? undefined : (hit ?? prev?.hit),
    tokens,
    window,
    threshold,
  }))
}

// Zeigt, was /compact aus dem Verlauf gemacht hat: Tokens davor und danach, dann die Zusammenfassung.
function logCompaction($: EngineInterface, r: { messages: readonly { text: string }[]; tokensBefore?: number; tokensAfter?: number }) {
  const key = `${r.tokensBefore}>${r.tokensAfter}>${r.messages[0]?.text.length}`
  if (key === lastLogged) return
  lastLogged = key

  const before = r.tokensBefore === undefined ? '?' : fmtTokens(r.tokensBefore)
  const after = r.tokensAfter === undefined ? '?' : fmtTokens(r.tokensAfter)
  $.ui.log(`Compact: Kontext ${before} → ${after} Tokens`)

  const summary = r.messages[0]?.text ?? ''
  for (const part of splitSummary(summary)) $.ui.log(part)
}

async function compactNow($: EngineInterface, surface: string, isWorking: boolean) {
  const queue = async () => {
    $.ui.toast('/compact eingereiht, startet nach der Antwort')
    await $.command.run({ command: 'compact' })
  }
  if (surface === 'desktop' || isWorking) return queue()
  try {
    const r = await $.session.compact()
    if (r.skip !== undefined) {
      $.ui.toast(`Compact nicht ausgeführt: ${r.skip}`)
      return
    }
    logCompaction($, r)
    await refresh($, false, true)
  } catch {
    await queue()
  }
}


export const register: Register = (on, options) => {
  let timer: { cancel: () => void } | undefined

  on('session.start', async ($, e, next) => {
    timer?.cancel()
    timer = $.clock.every(60_000, () => {
      void update($, tick, n => n + 1)
    })
    await refresh($, false)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await refresh($, e.usage !== null)
    return next(e)
  })

  // Der Cache-Typ steht nur in diesem Ereignis; wer ihn einmal gesehen hat, bekommt ihn im Balken.
  on('classic.PreModelSwitch', async ($, e, next) => {
    await update($, seenTtl, () => e.cache_ttl)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.compact', async ($, e, next) => {
    const r = await next(e)
    if (e.trigger === 'precompute' || r.skip !== undefined) return r
    logCompaction($, r)
    await refresh($, false, true)
    return r
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    await read($, tick)
    const data = await read($, info)
    const collapsed = await read($, isCollapsed)
    const now = await $.clock.now()
    const ttl: Ttl = resolveTtl(
      typeof options.cacheTtl === 'string' ? options.cacheTtl : undefined,
      await read($, seenTtl),
      await $.env.get('ENABLE_PROMPT_CACHING_1H'),
      await $.env.get('FORCE_PROMPT_CACHING_5M'),
    )
    const { Box, Button, Text } = $.ui.resolve(e)

    const window = data?.window ?? 0
    const threshold = window > 0 ? thresholdOf(window, data?.threshold) : 0
    const tokens = data?.tokens
    const weather = tokens !== undefined && threshold > 0 ? weatherOf(tokens, threshold) : 'sun'
    const isStorm = weather === 'storm'

    const ratio = data?.lastAt === undefined ? undefined : remainingRatio(data.lastAt, now, ttl)
    const level = ratio === undefined ? undefined : levelOf(ratio)
    const cacheText = ratio === undefined || level === undefined ? 'Cache –' : level === 'expired' ? 'Cache abgelaufen' : `Cache ${minutesLeft(ratio, ttl)} Min`
    const cells = ratio === undefined ? undefined : bar(ratio)
    const color = level === undefined ? undefined : COLORS[level]
    const fill = tokens === undefined || window === 0 ? '–' : `${percent(tokens, window)}%`

    const arrow = (
      <Button
        key="collapse"
        label={collapsed ? '▸' : '▾'}
        dimColor
        onPress={() => update($, isCollapsed, c => !c)}
      />
    )

    if (collapsed) {
      return (
        <Box gap={1}>
          <Text>{EMOJI[weather]}</Text>
          <Text color={color}>{cacheText}</Text>
          <Text>Kontext {fill}</Text>
          {arrow}
        </Box>
      )
    }

    return (
      <Box gap={1}>
        <Text color={color}>{cacheText}</Text>
        {cells !== undefined && (
          <Text>
            <Text color={color}>{cells.filled}</Text>
            <Text dimColor>{cells.empty}</Text>
          </Text>
        )}
        <Text dimColor>│</Text>
        <Text>Treffer {data?.hit === undefined ? '–' : `${data.hit}%`}</Text>
        <Text dimColor>│</Text>
        <Text>{EMOJI[weather]}</Text>
        <Text>Kontext {fill}</Text>
        <Text dimColor>{window > 0 ? `Schwelle ${percent(threshold, window)}%` : ''}</Text>
        <Button
          key="compact"
          label="Compact"
          variant={isStorm ? 'primary' : undefined}
          dimColor={!isStorm}
          onPress={() => compactNow($, e.surface, e.props.isWorking)}
        />
        {arrow}
      </Box>
    )
  })
}
