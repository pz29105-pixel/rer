import React, { useState } from 'react'
import { Alert, Text } from 'react-native'
import { Feld, Fortschritt, Karte, Knopf, Leise, Seite, Titel } from '../components/ui'
import { neueId, useStore } from '../store/AppStore'
import type { Kunde, Projekt } from '../types'
import type { Props } from './typen'

// Schritt 1: Kunde anlegen oder ändern. Bei bestehenden Kunden stehen darunter die Projekte.
export default function KundeFormScreen({ navigation, route }: Props<'KundeForm'>) {
  const { daten, speichereKunde, loescheKunde, speichereProjekt } = useStore()
  const vorhanden = daten.kunden.find(k => k.id === route.params.kundeId)
  const [k, setK] = useState<Kunde>(vorhanden ?? { id: neueId(), name: '', adresse: '', telefon: '', email: '', notizen: '' })
  const projekte = daten.projekte.filter(p => p.kundeId === k.id)
  const set = (teil: Partial<Kunde>) => setK({ ...k, ...teil })

  const neuesProjekt = (): string => {
    const jahr = new Date().getFullYear()
    const nr = String(daten.projekte.length + 1).padStart(4, '0')
    const p: Projekt = {
      id: neueId(), kundeId: k.id, erstellt: new Date().toISOString(), angebotsnummer: `A-${jahr}-${nr}`,
      raeume: [], zusatzIds: daten.einstellungen.zusatzleistungen.filter(z => z.id === 'z2').map(z => z.id),
    }
    speichereProjekt(p)
    return p.id
  }

  const weiter = () => {
    if (!k.name.trim()) return Alert.alert('Name fehlt', 'Bitte gib den Namen des Kunden ein.')
    speichereKunde(k)
    // Neuer Kunde: direkt ein Projekt anlegen und mit den Räumen weitermachen.
    navigation.replace('Raeume', { projektId: neuesProjekt() })
  }

  const loeschen = () =>
    Alert.alert('Kunde löschen?', 'Alle Projekte dieses Kunden werden ebenfalls gelöscht.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => { loescheKunde(k.id); navigation.goBack() } },
    ])

  return (
    <Seite
      unten={
        <>
          <Knopf text={vorhanden ? 'Neues Projekt für diesen Kunden' : 'Speichern und Räume erfassen'} onPress={weiter} />
          {vorhanden ? <Knopf variante="sekundaer" text="Nur Änderungen speichern" onPress={() => { if (k.name.trim()) { speichereKunde(k); navigation.goBack() } }} /> : null}
        </>
      }
    >
      <Fortschritt schritt={1} />
      <Feld label="Name" value={k.name} onChangeText={t => set({ name: t })} autoCapitalize="words" />
      <Feld label="Adresse" value={k.adresse} onChangeText={t => set({ adresse: t })} multiline />
      <Feld label="Telefon" value={k.telefon} onChangeText={t => set({ telefon: t })} keyboardType="phone-pad" />
      <Feld label="E-Mail" value={k.email} onChangeText={t => set({ email: t })} keyboardType="email-address" autoCapitalize="none" />
      <Feld label="Notizen" value={k.notizen} onChangeText={t => set({ notizen: t })} multiline />

      {projekte.length > 0 ? (
        <>
          <Titel>Bisherige Projekte</Titel>
          {projekte.map(p => (
            <Karte key={p.id} onPress={() => navigation.navigate('Projekt', { projektId: p.id })}>
              <Text style={{ fontWeight: '700', fontSize: 16 }}>{p.angebotsnummer}</Text>
              <Leise>{new Date(p.erstellt).toLocaleDateString('de-DE')} · {p.raeume.length} Raum/Räume</Leise>
            </Karte>
          ))}
        </>
      ) : null}
      {vorhanden ? <Knopf variante="gefahr" text="Kunde löschen" onPress={loeschen} style={{ marginTop: 12 }} /> : null}
    </Seite>
  )
}
