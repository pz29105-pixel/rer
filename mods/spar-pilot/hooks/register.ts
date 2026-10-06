import type { EngineInterface, Register } from 'claude-code'
import { classify, contextOf, cost, decide, isEffort, MODES, parseMode, type Decision, type Effort, type TaskClass, type Usage } from './logic.ts'

// Einstellungen liegen im Store (bleibt auf dem eigenen Rechner) und zusätzlich
// in einer Datei im Projekt (bleibt in Cloud-Sitzungen, sobald sie committet ist).
// Dieser Block ist in lern-gedaechtnis, design-eigenstil und spar-pilot gleich ($ darf nicht über Dateigrenzen gereicht werden).
const PROJECT_FILE = '.claude/mod-einstellungen.json'

let projectRoot: string | null | undefined

async function root($: EngineInterface) {
  if (projectRoot !== undefined) return projectRoot
  try {
    const r = await $.process.run(['git', 'rev-parse', '--show-toplevel'])
    projectRoot = r.exitCode === 0 ? r.stdout.trim() : null
  } catch {
    projectRoot = null
  }
  return projectRoot
}

async function readFile($: EngineInterface, dir: string): Promise<Record<string, unknown>> {
  try {
    const data: unknown = JSON.parse(await $.fs.read(`${dir}/${PROJECT_FILE}`))
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

// Wert aus der Projektdatei, sonst aus dem Store.
async function getSetting($: EngineInterface, key: string): Promise<unknown> {
  const dir = await root($)
  if (dir) {
    const data = await readFile($, dir)
    if (key in data) return data[key]
  }
  return $.store.get(key)
}

// Schreibt in Store und Projektdatei; `undefined` löscht. Antwortet, ob die Projektdatei geschrieben wurde.
async function setSetting($: EngineInterface, key: string, value: unknown): Promise<boolean> {
  if (value === undefined) await $.store.delete(key)
  else await $.store.set(key, value)
  const dir = await root($)
  if (!dir) return false
  try {
    const data = await readFile($, dir)
    if (value === undefined) delete data[key]
    else data[key] = value
    await $.fs.write(`${dir}/${PROJECT_FILE}`, JSON.stringify(data, null, 2) + '\n')
    return true
  } catch {
    return false
  }
}

const COMMIT_HINT = `Gespeichert in ${PROJECT_FILE} – beim nächsten Commit mit einchecken, damit es auch in Cloud-Sitzungen gilt.`

const MODE_KEY = 'modus'

// Sitzungszustand; ein Neuladen des Mods setzt ihn zurück, die Einstellung des Modus bleibt im Store.
let current: Effort | undefined // Denkaufwand, den der Spar-Pilot für das Hauptgespräch hält
let sessionEffort: Effort | undefined // was Claude Code selbst eingestellt hat (für manuelle /effort-Wechsel)
let pendingClass: TaskClass | undefined
let lastDecision: Decision | undefined
let lastContext = 0

const empty = (): Usage => ({ input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 })
let turnUsage = empty()
let turnCost = 0
const stats = { turns: 0, switches: 0, keptForCache: 0, cost: 0, usage: empty() }

function add(into: Usage, u: Usage) {
  into.input_tokens += u.input_tokens
  into.output_tokens += u.output_tokens
  into.cache_read_input_tokens += u.cache_read_input_tokens
  into.cache_creation_input_tokens += u.cache_creation_input_tokens
}

const money = (n: number) => `~$${n < 0.1 ? n.toFixed(3) : n.toFixed(2)}`
const kTokens = (n: number) => `${Math.round(n / 1000)}k`
const cacheRate = (u: Usage) => {
  const all = contextOf(u)
  return all ? Math.round((u.cache_read_input_tokens / all) * 100) : 0
}

const HELP = `Modi:
- sparsam: so wenig Denkaufwand wie vertretbar
- ausgewogen: leicht → low, normal → medium, schwer → high (Standard)
- qualitaet: normal → high, schwer → xhigh
- aus: Spar-Pilot greift nicht ein`

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'sparmodus', description: 'Spar-Pilot-Modus anzeigen oder setzen.', argumentHint: '[sparsam | ausgewogen | qualitaet | aus]' })
    await $.command.register({ name: 'verbrauch', description: 'Token-Verbrauch, Cache-Quote und Kosten dieser Sitzung.' })
    return next(e)
  })

  // Neue Aufgabe: Art der Aufgabe merken, entschieden wird beim ersten Modellaufruf.
  on('turn.start', ($, e, next) => {
    pendingClass = classify(e.text)
    lastDecision = undefined
    turnUsage = empty()
    turnCost = 0
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    const isMain = e.agentId === undefined
    let request = e

    if (isMain && isEffort(e.effort)) {
      if (sessionEffort !== undefined && e.effort !== sessionEffort) {
        // Der Nutzer hat /effort selbst umgestellt: das gilt, diese Aufgabe wird nicht umentschieden.
        current = e.effort
        pendingClass = undefined
        lastDecision = { effort: e.effort, isSwitch: false, reason: 'manuell gesetzt' }
      }
      sessionEffort = e.effort
      current ??= e.effort

      if (pendingClass !== undefined) {
        const mode = parseMode(await getSetting($, MODE_KEY))
        lastDecision = decide({ mode, taskClass: pendingClass, current, contextTokens: lastContext })
        pendingClass = undefined
        if (lastDecision.isSwitch) stats.switches++
        else if (lastDecision.reason.includes('Kontext')) stats.keptForCache++
        current = lastDecision.effort
      }
      if (current !== e.effort) request = { ...e, effort: current }
    }

    const result = yield* next(request)

    if (result.usage) {
      const stepCost = cost(result.usage, result.usage.model) ?? 0
      add(turnUsage, result.usage)
      add(stats.usage, result.usage)
      turnCost += stepCost
      stats.cost += stepCost
      if (isMain) lastContext = contextOf(result.usage)
    }
    return result
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    stats.turns++
    const effort = current ? `⚡ ${current}` : '⚡ –'
    $.ui.status(`${effort} · ${kTokens(lastContext)} Kontext · ${cacheRate(turnUsage)}% Cache · Antwort ${money(turnCost)} · Sitzung ${money(stats.cost)}`)
    if (lastDecision?.isSwitch) $.ui.toast(`Spar-Pilot: Denkaufwand → ${lastDecision.effort} (${lastDecision.reason})`)
    return next(e)
  })

  on('command.run', { command: 'sparmodus' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase().replace('ä', 'ae')
    if (arg === '') {
      const mode = parseMode(await getSetting($, MODE_KEY))
      return { text: `Spar-Pilot-Modus: ${mode}. Aktueller Denkaufwand: ${current ?? 'noch unbekannt'}.\n\n${HELP}` }
    }
    const mode = MODES.find(m => m === arg)
    if (!mode) return { text: `Unbekannter Modus "${arg}".\n\n${HELP}` }
    const inProject = await setSetting($, MODE_KEY, mode)
    return { text: `Spar-Pilot-Modus gesetzt: ${mode}. Gilt ab der nächsten Aufgabe.${inProject ? `\n${COMMIT_HINT}` : ''}` }
  })

  on('command.run', { command: 'verbrauch' }, async $ => {
    const u = stats.usage
    const mode = parseMode(await getSetting($, MODE_KEY))
    return {
      text: [
        `Spar-Pilot (${mode}) – diese Sitzung:`,
        `- Aufgaben: ${stats.turns}, Denkaufwand gewechselt: ${stats.switches}×, Wechsel wegen Cache ausgelassen: ${stats.keptForCache}×`,
        `- Aktueller Denkaufwand: ${current ?? 'noch unbekannt'}, Kontext: ${kTokens(lastContext)} Tokens`,
        `- Input: ${kTokens(u.input_tokens)} neu · ${kTokens(u.cache_read_input_tokens)} aus Cache · ${kTokens(u.cache_creation_input_tokens)} in Cache geschrieben`,
        `- Output: ${kTokens(u.output_tokens)} · Cache-Quote: ${cacheRate(u)}%`,
        `- Kosten (API-Listenpreis-Gegenwert): ${money(stats.cost)}`,
      ].join('\n'),
    }
  })
}
