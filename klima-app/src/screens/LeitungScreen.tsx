import React from 'react'
import { Switch, Text, View } from 'react-native'
import { Fortschritt, Karte, Knopf, Leise, Seite, ZahlFeld } from '../components/ui'
import { useProjekt, useStore } from '../store/AppStore'
import { farben } from '../theme'
import type { Props } from './typen'

// Schritt 6: Leitungslänge eingeben, Wanddurchbruch festlegen und den Weg auf dem Foto einzeichnen.
export default function LeitungScreen({ navigation, route }: Props<'Leitung'>) {
  const { projektId } = route.params
  const { projekt } = useProjekt(projektId)
  const { speichereRaum } = useStore()
  if (!projekt) return null
  return (
    <Seite unten={<Knopf text="Weiter: Kostenschätzung" onPress={() => navigation.navigate('Kosten', { projektId })} />}>
      <Fortschritt schritt={6} />
      {projekt.raeume.map(r => (
        <Karte key={r.id}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: farben.text, marginBottom: 10 }}>{r.name}</Text>
          <ZahlFeld label="Leitungslänge" einheit="m" wert={r.leitungslaenge} onChange={n => speichereRaum(projektId, { ...r, leitungslaenge: n })} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, marginBottom: 8 }}>
            <Text style={{ fontSize: 17 }}>Wanddurchbruch nötig</Text>
            <Switch value={r.wanddurchbruch} onValueChange={v => speichereRaum(projektId, { ...r, wanddurchbruch: v })} trackColor={{ true: farben.haupt }} />
          </View>
          {r.innen ? (
            <Knopf variante="sekundaer" text="Leitungsweg einzeichnen" onPress={() => navigation.navigate('FotoEditor', { projektId, ziel: r.id, modus: 'leitung' })} />
          ) : (
            <Leise>Für das Einzeichnen fehlt noch ein Foto (Schritt 5).</Leise>
          )}
        </Karte>
      ))}
      {projekt.aussen ? (
        <Knopf variante="sekundaer" text="Außenwand: Leitung einzeichnen" onPress={() => navigation.navigate('FotoEditor', { projektId, ziel: 'aussen', modus: 'leitung' })} />
      ) : null}
    </Seite>
  )
}
