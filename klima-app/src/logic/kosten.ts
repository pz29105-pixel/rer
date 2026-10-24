import type { Einstellungen, Geraet, Projekt } from '../types'

export interface Position {
  text: string
  menge: number
  einzelpreis: number
  summe: number
}

export interface Kostenaufstellung {
  positionen: Position[]
  netto: number
  mwst: number
  brutto: number
  mwstSatz: number
}

const runde = (n: number) => Math.round(n * 100) / 100

/** Stellt alle Kosten eines Projekts zusammen. Preise kommen aus den Einstellungen. */
export function berechneKosten(p: Projekt, geraete: Geraet[], e: Einstellungen): Kostenaufstellung {
  const pos: Position[] = []
  const add = (text: string, menge: number, einzelpreis: number) => {
    if (menge > 0) pos.push({ text, menge, einzelpreis, summe: runde(menge * einzelpreis) })
  }
  const finde = (id?: string) => geraete.find(g => g.id === id)

  for (const r of p.raeume) {
    const g = finde(r.geraetId)
    if (g) add(`${g.hersteller} ${g.name} (${r.name})`, 1, g.preis)
  }
  const aussen = finde(p.aussengeraetId)
  if (aussen) add(`${aussen.hersteller} ${aussen.name}`, 1, aussen.preis)

  const innengeraete = p.raeume.filter(r => r.geraetId).length
  add('Montage Innengerät', innengeraete, e.preise.montageProInnengeraet)
  if (aussen) add('Montage Außengerät', 1, e.preise.montageAussengeraet)

  const meter = p.raeume.reduce((s, r) => s + (r.leitungslaenge || 0), 0)
  add('Kältemittel- und Kondensatleitung (je Meter)', meter, e.preise.leitungProMeter)
  add('Wanddurchbruch', p.raeume.filter(r => r.wanddurchbruch).length, e.preise.wanddurchbruch)
  add('Zusatzmaterial (je Raum)', p.raeume.length, e.preise.zusatzmaterialProRaum)

  for (const z of e.zusatzleistungen.filter(z => p.zusatzIds.includes(z.id))) add(z.name, 1, z.preis)

  const netto = runde(pos.reduce((s, x) => s + x.summe, 0))
  const mwst = runde((netto * e.preise.mwstSatz) / 100)
  return { positionen: pos, netto, mwst, brutto: runde(netto + mwst), mwstSatz: e.preise.mwstSatz }
}

export const euro = (n: number) =>
  n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
