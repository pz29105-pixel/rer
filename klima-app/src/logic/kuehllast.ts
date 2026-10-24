import type { Daemmung, Geraet, Himmelsrichtung, Nutzung, Raum } from '../types'

// FAUSTFORMEL, keine normgerechte Heizlast-/Kühllastberechnung (VDI 2078 / DIN EN 12831).
// Die Werte sind übliche Praxis-Richtwerte und sollen die Beratung unterstützen.

/** Grundlast je m³ Raumvolumen in W, abhängig von der Dämmung. */
export const GRUNDLAST_W_PRO_M3: Record<Daemmung, number> = { gut: 25, mittel: 32, schlecht: 40 }

/** Solare Last je m² Fensterfläche in W, abhängig von der Himmelsrichtung. */
export const FENSTER_W_PRO_M2: Record<Himmelsrichtung, number> = {
  N: 60, NO: 120, O: 180, SO: 220, S: 250, SW: 270, W: 280, NW: 160,
}

/** Interne Wärmelast der Nutzung in W (Geräte, Beleuchtung), ohne Personen. */
export const NUTZUNG_W: Record<Nutzung, number> = {
  Schlafzimmer: 0, Wohnzimmer: 200, Büro: 300, Küche: 500, Serverraum: 1500, Sonstiges: 100,
}

const WATT_PRO_PERSON = 100
const DACHGESCHOSS_ZUSCHLAG = 0.2

/** Übliche Leistungsstufen von Klimageräten in kW. */
export const LEISTUNGSSTUFEN = [2.0, 2.5, 3.5, 5.0, 7.0, 10.0, 14.0]

export interface Aufschluesselung {
  grundlast: number
  fenster: number
  personen: number
  nutzung: number
  dachzuschlag: number
}

export interface Kuehlleistung {
  watt: number
  kw: number // auf 0,1 kW aufgerundet
  stufe: number // nächste übliche Gerätegröße
  teile: Aufschluesselung
}

export function berechneRaum(r: Raum): Kuehlleistung {
  const volumen = r.laenge * r.breite * r.hoehe
  const fensterFlaeche = r.fensterAnzahl * r.fensterBreite * r.fensterHoehe
  const grundlast = volumen * GRUNDLAST_W_PRO_M3[r.daemmung]
  const fenster = fensterFlaeche * FENSTER_W_PRO_M2[r.himmelsrichtung]
  const personen = r.personen * WATT_PRO_PERSON
  const nutzung = NUTZUNG_W[r.nutzung]
  const summe = grundlast + fenster + personen + nutzung
  const dachzuschlag = r.dachgeschoss ? summe * DACHGESCHOSS_ZUSCHLAG : 0
  const watt = Math.round(summe + dachzuschlag)
  return {
    watt,
    kw: Math.ceil(watt / 100) / 10,
    stufe: waehleStufe(watt / 1000),
    teile: { grundlast, fenster, personen, nutzung, dachzuschlag },
  }
}

export function waehleStufe(kw: number): number {
  return LEISTUNGSSTUFEN.find(s => s >= kw) ?? Math.ceil(kw)
}

export interface Gesamtleistung {
  summeKw: number
  /** Empfohlene Leistung des Multisplit-Außengeräts (nicht alle Räume laufen gleichzeitig). */
  multisplitKw: number
  istMultisplit: boolean
}

const GLEICHZEITIGKEIT = 0.8

export function berechneGesamt(raeume: Raum[]): Gesamtleistung {
  const summeKw = raeume.reduce((s, r) => s + berechneRaum(r).watt, 0) / 1000
  const istMultisplit = raeume.length > 1
  const multisplitKw = istMultisplit ? Math.ceil(summeKw * GLEICHZEITIGKEIT * 10) / 10 : summeKw
  return { summeKw: Math.round(summeKw * 10) / 10, multisplitKw, istMultisplit }
}

/** Ein Gerät passt, wenn seine Kühlleistung die Berechnung deckt, aber nicht weit darüber liegt. */
export function passtZuLeistung(g: Geraet, benoetigtKw: number): boolean {
  return g.kuehlleistung >= benoetigtKw * 0.95 && g.kuehlleistung <= Math.max(benoetigtKw * 1.4, benoetigtKw + 1)
}
