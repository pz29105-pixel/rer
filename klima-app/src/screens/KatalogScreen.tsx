import React, { useState } from 'react'
import { Alert, Image, Text, View } from 'react-native'
import { TYP_NAMEN, bildFuer } from '../components/geraeteBild'
import { Auswahl, Feld, Karte, Knopf, Leise, Seite, ZahlFeld } from '../components/ui'
import { euro } from '../logic/kosten'
import { waehleFoto } from '../storage/fotoWahl'
import { neueId, useStore } from '../store/AppStore'
import { farben } from '../theme'
import type { GeraeteTyp, Geraet } from '../types'
import type { Props } from './typen'

export default function KatalogScreen({ navigation }: Props<'Katalog'>) {
  const { daten } = useStore()
  return (
    <Seite unten={<Knopf text="Gerät hinzufügen" onPress={() => navigation.navigate('GeraetForm', {})} />}>
      {daten.geraete.length === 0 ? <Leise>Der Katalog ist leer.</Leise> : null}
      {daten.geraete.map(g => (
        <Karte key={g.id} onPress={() => navigation.navigate('GeraetForm', { geraetId: g.id })}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Image source={bildFuer(g)} style={{ width: 60, height: 60 }} resizeMode="contain" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: farben.text }}>{g.name}</Text>
              <Leise>{g.hersteller} · {TYP_NAMEN[g.typ]} · {String(g.kuehlleistung).replace('.', ',')} kW · {euro(g.preis)}</Leise>
            </View>
          </View>
        </Karte>
      ))}
    </Seite>
  )
}

const TYPEN = Object.keys(TYP_NAMEN) as GeraeteTyp[]

export function GeraetFormScreen({ navigation, route }: Props<'GeraetForm'>) {
  const { daten, speichereGeraet, loescheGeraet } = useStore()
  const vorhanden = daten.geraete.find(g => g.id === route.params.geraetId)
  const [g, setG] = useState<Geraet>(
    vorhanden ?? { id: neueId(), name: '', hersteller: '', typ: 'wand', kuehlleistung: 0, heizleistung: 0, breite: 0, hoehe: 0, tiefe: 0, preis: 0 },
  )
  const set = (teil: Partial<Geraet>) => setG(alt => ({ ...alt, ...teil }))

  const bild = async () => {
    // PNG mit transparentem Hintergrund aus der Galerie. Die Datei wird unverändert kopiert.
    const uri = await waehleFoto('galerie', { endung: 'png' })
    if (uri) set({ bildUri: uri })
  }
  const speichern = () => {
    if (!g.name.trim()) return Alert.alert('Name fehlt', 'Bitte gib dem Gerät einen Namen.')
    speichereGeraet(g)
    navigation.goBack()
  }
  const loeschen = () =>
    Alert.alert('Gerät löschen?', g.name, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => { loescheGeraet(g.id); navigation.goBack() } },
    ])

  return (
    <Seite unten={<Knopf text="Speichern" onPress={speichern} />}>
      <View style={{ alignItems: 'center', marginBottom: 12 }}>
        <Image source={bildFuer(g)} style={{ width: 160, height: 120 }} resizeMode="contain" />
      </View>
      <Knopf variante="sekundaer" text={g.bildUri ? 'Produktbild ändern' : 'Produktbild hochladen (PNG)'} onPress={bild} style={{ marginBottom: 16 }} />
      <Feld label="Name" value={g.name} onChangeText={t => set({ name: t })} />
      <Feld label="Hersteller" value={g.hersteller} onChangeText={t => set({ hersteller: t })} />
      <Auswahl label="Typ" wert={TYP_NAMEN[g.typ]} optionen={Object.values(TYP_NAMEN)} onChange={n => set({ typ: TYPEN.find(t => TYP_NAMEN[t] === n)! })} />
      <ZahlFeld label="Kühlleistung" einheit="kW" wert={g.kuehlleistung} onChange={n => set({ kuehlleistung: n })} />
      <ZahlFeld label="Heizleistung" einheit="kW" wert={g.heizleistung} onChange={n => set({ heizleistung: n })} />
      <ZahlFeld label="Breite" einheit="mm" wert={g.breite} onChange={n => set({ breite: n })} />
      <ZahlFeld label="Höhe" einheit="mm" wert={g.hoehe} onChange={n => set({ hoehe: n })} />
      <ZahlFeld label="Tiefe" einheit="mm" wert={g.tiefe} onChange={n => set({ tiefe: n })} />
      <ZahlFeld label="Preis netto" einheit="€" wert={g.preis} onChange={n => set({ preis: n })} />
      {vorhanden ? <Knopf variante="gefahr" text="Gerät löschen" onPress={loeschen} /> : null}
    </Seite>
  )
}
