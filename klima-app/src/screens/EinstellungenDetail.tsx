import React, { useState } from 'react'
import { Image, Text, View } from 'react-native'
import { Feld, Knopf, Leise, Seite, Titel, ZahlFeld } from '../components/ui'
import { waehleFoto } from '../storage/fotoWahl'
import { neueId, useStore } from '../store/AppStore'
import type { Einstellungen } from '../types'
import type { Props } from './typen'

/** Gemeinsame Hülle: lokale Kopie bearbeiten, mit „Speichern“ übernehmen. */
function useEinstellungen(zurueck: () => void) {
  const { daten, aendere } = useStore()
  const [e, setE] = useState<Einstellungen>(daten.einstellungen)
  const speichern = () => {
    aendere(d => ({ ...d, einstellungen: e }))
    zurueck()
  }
  return { e, setE, speichern }
}

export function FirmaScreen({ navigation }: Props<'Firma'>) {
  const { e, setE, speichern } = useEinstellungen(navigation.goBack)
  const f = e.firma
  const set = (teil: Partial<typeof f>) => setE({ ...e, firma: { ...f, ...teil } })
  const logo = async () => {
    const uri = await waehleFoto('galerie', { endung: 'png' })
    if (uri) set({ logoUri: uri })
  }
  return (
    <Seite unten={<Knopf text="Speichern" onPress={speichern} />}>
      <Feld label="Firmenname" value={f.name} onChangeText={t => set({ name: t })} />
      <Feld label="Adresse" value={f.adresse} onChangeText={t => set({ adresse: t })} multiline />
      <Feld label="Telefon" value={f.telefon} onChangeText={t => set({ telefon: t })} keyboardType="phone-pad" />
      <Feld label="E-Mail" value={f.email} onChangeText={t => set({ email: t })} keyboardType="email-address" autoCapitalize="none" />
      <Titel>Logo</Titel>
      {f.logoUri ? <Image source={{ uri: f.logoUri }} style={{ height: 80, marginBottom: 10 }} resizeMode="contain" /> : <Leise>Noch kein Logo gewählt.</Leise>}
      <Knopf variante="sekundaer" text={f.logoUri ? 'Logo ändern' : 'Logo aus Galerie wählen'} onPress={logo} />
      {f.logoUri ? <Knopf variante="gefahr" text="Logo entfernen" onPress={() => set({ logoUri: undefined })} style={{ marginTop: 10 }} /> : null}
    </Seite>
  )
}

export function PreiseScreen({ navigation }: Props<'Preise'>) {
  const { e, setE, speichern } = useEinstellungen(navigation.goBack)
  const p = e.preise
  const set = (teil: Partial<typeof p>) => setE({ ...e, preise: { ...p, ...teil } })
  const zusatz = (id: string, teil: Partial<{ name: string; preis: number }>) =>
    setE({ ...e, zusatzleistungen: e.zusatzleistungen.map(z => (z.id === id ? { ...z, ...teil } : z)) })
  return (
    <Seite unten={<Knopf text="Speichern" onPress={speichern} />}>
      <Leise>Alle Preise netto in Euro.</Leise>
      <ZahlFeld label="Leitung pro Meter" einheit="€" wert={p.leitungProMeter} onChange={n => set({ leitungProMeter: n })} />
      <ZahlFeld label="Montage je Innengerät" einheit="€" wert={p.montageProInnengeraet} onChange={n => set({ montageProInnengeraet: n })} />
      <ZahlFeld label="Montage Außengerät" einheit="€" wert={p.montageAussengeraet} onChange={n => set({ montageAussengeraet: n })} />
      <ZahlFeld label="Wanddurchbruch" einheit="€" wert={p.wanddurchbruch} onChange={n => set({ wanddurchbruch: n })} />
      <ZahlFeld label="Zusatzmaterial je Raum" einheit="€" wert={p.zusatzmaterialProRaum} onChange={n => set({ zusatzmaterialProRaum: n })} />
      <ZahlFeld label="MwSt.-Satz" einheit="%" wert={p.mwstSatz} onChange={n => set({ mwstSatz: n })} />
      <Titel>Zusatzleistungen</Titel>
      {e.zusatzleistungen.map(z => (
        <View key={z.id} style={{ marginBottom: 6 }}>
          <Feld label="Bezeichnung" value={z.name} onChangeText={t => zusatz(z.id, { name: t })} />
          <ZahlFeld label="Preis" einheit="€" wert={z.preis} onChange={n => zusatz(z.id, { preis: n })} />
          <Text style={{ color: '#C62828', fontWeight: '700', marginBottom: 14 }} onPress={() => setE({ ...e, zusatzleistungen: e.zusatzleistungen.filter(x => x.id !== z.id) })}>Entfernen</Text>
        </View>
      ))}
      <Knopf variante="sekundaer" text="Zusatzleistung hinzufügen" onPress={() => setE({ ...e, zusatzleistungen: [...e.zusatzleistungen, { id: neueId(), name: 'Neue Leistung', preis: 0 }] })} />
    </Seite>
  )
}

export function TexteScreen({ navigation }: Props<'Texte'>) {
  const { e, setE, speichern } = useEinstellungen(navigation.goBack)
  const t = e.texte
  const set = (teil: Partial<typeof t>) => setE({ ...e, texte: { ...t, ...teil } })
  return (
    <Seite unten={<Knopf text="Speichern" onPress={speichern} />}>
      <Feld label="Einleitung" value={t.einleitung} onChangeText={x => set({ einleitung: x })} multiline />
      <Feld label="Schlusstext" value={t.schluss} onChangeText={x => set({ schluss: x })} multiline />
      <Feld label="Zahlungsbedingungen" value={t.zahlung} onChangeText={x => set({ zahlung: x })} multiline />
      <ZahlFeld label="Gültigkeit des Angebots" einheit="Tage" wert={t.gueltigkeitTage} onChange={n => set({ gueltigkeitTage: Math.round(n) })} />
    </Seite>
  )
}
