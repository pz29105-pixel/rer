// Alle Datentypen der App. Alles wird lokal als JSON gespeichert (siehe store/AppStore.tsx).

export type Himmelsrichtung = 'N' | 'NO' | 'O' | 'SO' | 'S' | 'SW' | 'W' | 'NW'
export type Daemmung = 'gut' | 'mittel' | 'schlecht'
export type Nutzung = 'Schlafzimmer' | 'Wohnzimmer' | 'Büro' | 'Küche' | 'Serverraum' | 'Sonstiges'
export type GeraeteTyp = 'wand' | 'kassette' | 'truhe' | 'kanal' | 'aussen' | 'multisplit'

export interface Kunde {
  id: string
  name: string
  adresse: string
  telefon: string
  email: string
  notizen: string
}

export interface Punkt { x: number; y: number } // relativ zur Bildfläche, 0..1

export interface Strich {
  art: 'kaeltemittel' | 'kondensat'
  punkte: Punkt[]
}

/** Foto mit aufgelegtem Gerät, eingezeichneter Leitung und Wanddurchbruch. */
export interface FotoSzene {
  foto: string // Datei-URI des Originalfotos
  geraetId?: string // Gerät, dessen Bild aufgelegt wird
  x: number // Mittelpunkt des Geräts, 0..1
  y: number
  skalierung: number // 1 = Standardgröße
  drehung: number // Grad
  striche: Strich[]
  durchbruch?: Punkt
  render?: string // Datei-URI des fertig zusammengesetzten Bildes (für das PDF)
}

export interface Raum {
  id: string
  name: string
  laenge: number // m
  breite: number // m
  hoehe: number // m
  fensterAnzahl: number
  fensterBreite: number // m
  fensterHoehe: number // m
  himmelsrichtung: Himmelsrichtung
  daemmung: Daemmung
  personen: number
  nutzung: Nutzung
  dachgeschoss: boolean
  geraetId?: string // Innengerät
  leitungslaenge: number // m, manuell
  wanddurchbruch: boolean
  innen?: FotoSzene
}

export interface Projekt {
  id: string
  kundeId: string
  erstellt: string // ISO-Datum
  angebotsnummer: string
  raeume: Raum[]
  aussengeraetId?: string // Außengerät oder Multisplit-Gerät
  aussen?: FotoSzene
  zusatzIds: string[] // gewählte Zusatzleistungen
}

export interface Geraet {
  id: string
  name: string
  hersteller: string
  typ: GeraeteTyp
  kuehlleistung: number // kW
  heizleistung: number // kW
  breite: number // mm
  hoehe: number // mm
  tiefe: number // mm
  preis: number // € netto
  bildUri?: string // eigenes Produktbild (PNG), sonst Platzhalter nach Typ
}

export interface Zusatzleistung {
  id: string
  name: string
  preis: number // € netto
}

export interface Einstellungen {
  firma: { name: string; adresse: string; telefon: string; email: string; logoUri?: string }
  preise: {
    leitungProMeter: number
    montageProInnengeraet: number
    montageAussengeraet: number
    wanddurchbruch: number
    zusatzmaterialProRaum: number
    mwstSatz: number // Prozent
  }
  zusatzleistungen: Zusatzleistung[]
  texte: { einleitung: string; schluss: string; zahlung: string; gueltigkeitTage: number }
}

export interface AppDaten {
  kunden: Kunde[]
  projekte: Projekt[]
  geraete: Geraet[]
  einstellungen: Einstellungen
}
