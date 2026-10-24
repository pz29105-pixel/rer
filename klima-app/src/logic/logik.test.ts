import test from 'node:test'
import assert from 'node:assert/strict'
import { berechneGesamt, berechneRaum, passtZuLeistung, waehleStufe } from './kuehllast.ts'
import { berechneKosten } from './kosten.ts'
import { BEISPIEL_GERAETE, STANDARD_DATEN } from '../data/defaults.ts'
import type { Projekt, Raum } from '../types.ts'

const raum = (extra: Partial<Raum> = {}): Raum => ({
  id: 'r', name: 'Wohnzimmer', laenge: 5, breite: 4, hoehe: 2.5, fensterAnzahl: 2, fensterBreite: 1.2,
  fensterHoehe: 1.4, himmelsrichtung: 'S', daemmung: 'mittel', personen: 2, nutzung: 'Wohnzimmer',
  dachgeschoss: false, leitungslaenge: 5, wanddurchbruch: true, ...extra,
})

test('Kühlleistung: Wohnzimmer liegt im üblichen Bereich', () => {
  const k = berechneRaum(raum())
  assert.equal(k.watt, 50 * 32 + 3.36 * 250 + 200 + 200) // Volumen 50 m³
  assert.equal(k.stufe, 3.5)
})

test('Dachgeschoss und schlechte Dämmung erhöhen die Leistung', () => {
  const normal = berechneRaum(raum()).watt
  assert.ok(berechneRaum(raum({ dachgeschoss: true })).watt > normal)
  assert.ok(berechneRaum(raum({ daemmung: 'schlecht' })).watt > normal)
})

test('Stufen und Multisplit', () => {
  assert.equal(waehleStufe(2.1), 2.5)
  assert.equal(waehleStufe(20), 20)
  const g = berechneGesamt([raum(), raum()])
  assert.equal(g.istMultisplit, true)
  assert.ok(g.multisplitKw < g.summeKw)
  assert.equal(passtZuLeistung(BEISPIEL_GERAETE[1], 3.2), true)
  assert.equal(passtZuLeistung(BEISPIEL_GERAETE[2], 2), false)
})

test('Kosten: Netto, MwSt. und Brutto', () => {
  const p: Projekt = {
    id: 'p', kundeId: 'k', erstellt: '2026-01-01', angebotsnummer: 'A-1', zusatzIds: ['z2'],
    raeume: [raum({ geraetId: 'g2' })], aussengeraetId: 'g7',
  }
  const k = berechneKosten(p, BEISPIEL_GERAETE, STANDARD_DATEN.einstellungen)
  // 790 + 890 + 450 + 250 + 5*45 + 90 + 80 + 120
  assert.equal(k.netto, 2895)
  assert.equal(k.mwst, 550.05)
  assert.equal(k.brutto, 3445.05)
})
