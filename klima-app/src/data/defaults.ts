import type { AppDaten, Geraet } from '../types'

// Hier trägst du die Firmendaten ein, die beim ersten Start vorbelegt sind.
// Später lassen sie sich in der App unter „Einstellungen“ ändern.
export const BRANDING = {
  appName: 'KlimaPlaner', // [App-Name]
  hauptfarbe: '#0A5EB0', // [Hauptfarbe]
  akzentfarbe: '#F59E0B', // [Akzentfarbe]
  firma: {
    name: 'Muster Klimatechnik GmbH', // [Name]
    adresse: 'Musterstraße 1, 12345 Musterstadt', // [Adresse]
    telefon: '01234 567890', // [Telefon]
    email: 'info@beispiel.de', // [E-Mail]
  },
}

// Beispielgeräte mit Platzhalterbildern. Preise netto, nur zur Orientierung.
export const BEISPIEL_GERAETE: Geraet[] = [
  { id: 'g1', name: 'Wandgerät 2,5 kW', hersteller: 'Beispiel', typ: 'wand', kuehlleistung: 2.5, heizleistung: 3.2, breite: 800, hoehe: 290, tiefe: 210, preis: 690 },
  { id: 'g2', name: 'Wandgerät 3,5 kW', hersteller: 'Beispiel', typ: 'wand', kuehlleistung: 3.5, heizleistung: 4.0, breite: 850, hoehe: 295, tiefe: 215, preis: 790 },
  { id: 'g3', name: 'Wandgerät 5,0 kW', hersteller: 'Beispiel', typ: 'wand', kuehlleistung: 5.0, heizleistung: 5.8, breite: 1000, hoehe: 320, tiefe: 230, preis: 990 },
  { id: 'g4', name: 'Deckenkassette 5,0 kW', hersteller: 'Beispiel', typ: 'kassette', kuehlleistung: 5.0, heizleistung: 5.6, breite: 840, hoehe: 250, tiefe: 840, preis: 1490 },
  { id: 'g5', name: 'Truhengerät 3,5 kW', hersteller: 'Beispiel', typ: 'truhe', kuehlleistung: 3.5, heizleistung: 4.0, breite: 700, hoehe: 600, tiefe: 215, preis: 1190 },
  { id: 'g6', name: 'Kanalgerät 5,0 kW', hersteller: 'Beispiel', typ: 'kanal', kuehlleistung: 5.0, heizleistung: 5.6, breite: 900, hoehe: 200, tiefe: 450, preis: 1390 },
  { id: 'g7', name: 'Außengerät 3,5 kW', hersteller: 'Beispiel', typ: 'aussen', kuehlleistung: 3.5, heizleistung: 4.0, breite: 780, hoehe: 540, tiefe: 290, preis: 890 },
  { id: 'g8', name: 'Außengerät 5,0 kW', hersteller: 'Beispiel', typ: 'aussen', kuehlleistung: 5.0, heizleistung: 5.8, breite: 850, hoehe: 600, tiefe: 330, preis: 1190 },
  { id: 'g9', name: 'Multisplit 2 Räume (5,2 kW)', hersteller: 'Beispiel', typ: 'multisplit', kuehlleistung: 5.2, heizleistung: 6.0, breite: 800, hoehe: 550, tiefe: 300, preis: 1590 },
  { id: 'g10', name: 'Multisplit 3 Räume (7,9 kW)', hersteller: 'Beispiel', typ: 'multisplit', kuehlleistung: 7.9, heizleistung: 8.5, breite: 900, hoehe: 700, tiefe: 330, preis: 2290 },
]

export const STANDARD_DATEN: AppDaten = {
  kunden: [],
  projekte: [],
  geraete: BEISPIEL_GERAETE,
  einstellungen: {
    firma: { ...BRANDING.firma },
    // Realistische Beispielpreise (netto) für Deutschland, bitte an eigene Preise anpassen.
    preise: {
      leitungProMeter: 45,
      montageProInnengeraet: 450,
      montageAussengeraet: 250,
      wanddurchbruch: 90,
      zusatzmaterialProRaum: 80,
      mwstSatz: 19,
    },
    zusatzleistungen: [
      { id: 'z1', name: 'Kondensatpumpe', preis: 180 },
      { id: 'z2', name: 'Inbetriebnahme und Einweisung', preis: 120 },
      { id: 'z3', name: 'Konsole / Wandhalterung Außengerät', preis: 95 },
      { id: 'z4', name: 'Entsorgung Verpackung und Altmaterial', preis: 60 },
    ],
    texte: {
      einleitung: 'Vielen Dank für Ihr Interesse und das angenehme Beratungsgespräch. Gerne unterbreiten wir Ihnen folgendes Angebot für Ihre Klimaanlage:',
      schluss: 'Wir freuen uns auf Ihren Auftrag und stehen für Rückfragen jederzeit zur Verfügung.',
      zahlung: 'Zahlbar innerhalb von 14 Tagen nach Rechnungsstellung ohne Abzug.',
      gueltigkeitTage: 30,
    },
  },
}
