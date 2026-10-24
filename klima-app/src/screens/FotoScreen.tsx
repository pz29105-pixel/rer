import React from 'react'
import { Image, Text, View } from 'react-native'
import { Fortschritt, Karte, Knopf, Leise, Seite } from '../components/ui'
import { frageQuelle, waehleFoto } from '../storage/fotoWahl'
import { useProjekt, useStore } from '../store/AppStore'
import { farben } from '../theme'
import type { FotoSzene } from '../types'
import type { Props } from './typen'

const leereSzene = (foto: string, geraetId?: string): FotoSzene => ({ foto, geraetId, x: 0.5, y: 0.35, skalierung: 1, drehung: 0, striche: [] })

// Schritt 5: Foto je Raum (Innengerät) und von der Außenwand (Außengerät) aufnehmen.
export default function FotoScreen({ navigation, route }: Props<'Foto'>) {
  const { projektId } = route.params
  const { projekt } = useProjekt(projektId)
  const { daten, speichereProjekt, speichereRaum } = useStore()
  if (!projekt) return null

  const neuesFoto = async (ziel: string) => {
    const quelle = await frageQuelle()
    if (!quelle) return
    const uri = await waehleFoto(quelle)
    if (!uri) return
    if (ziel === 'aussen') {
      speichereProjekt({ ...projekt, aussen: leereSzene(uri, projekt.aussengeraetId) })
    } else {
      const r = projekt.raeume.find(x => x.id === ziel)!
      speichereRaum(projektId, { ...r, innen: leereSzene(uri, r.geraetId) })
    }
    navigation.navigate('FotoEditor', { projektId, ziel, modus: 'geraet' })
  }

  const eintrag = (titel: string, ziel: string, szene: FotoSzene | undefined, geraetName?: string) => (
    <Karte key={ziel}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: farben.text }}>{titel}</Text>
      <Leise>{geraetName ? `Gerät: ${geraetName}` : 'Noch kein Gerät gewählt (Schritt 4).'}</Leise>
      {szene ? (
        <Image source={{ uri: szene.render ?? szene.foto }} style={{ width: '100%', height: 180, borderRadius: 10, marginBottom: 10 }} resizeMode="cover" />
      ) : null}
      <View style={{ gap: 8 }}>
        {szene ? <Knopf text="Gerät auf Foto verschieben" onPress={() => navigation.navigate('FotoEditor', { projektId, ziel, modus: 'geraet' })} /> : null}
        <Knopf variante="sekundaer" text={szene ? 'Anderes Foto aufnehmen' : 'Foto aufnehmen oder wählen'} deaktiviert={!geraetName} onPress={() => neuesFoto(ziel)} />
      </View>
    </Karte>
  )

  const aussen = daten.geraete.find(g => g.id === projekt.aussengeraetId)
  return (
    <Seite unten={<Knopf text="Weiter: Leitungsweg" onPress={() => navigation.navigate('Leitung', { projektId })} />}>
      <Fortschritt schritt={5} />
      <Leise>Mache ein Foto vom Raum und lege das Gerät mit dem Finger an die richtige Stelle: ziehen = verschieben, zwei Finger = vergrößern und drehen.</Leise>
      {projekt.raeume.map(r => eintrag(`${r.name} (Innengerät)`, r.id, r.innen, daten.geraete.find(g => g.id === r.geraetId)?.name))}
      {eintrag('Außenwand (Außengerät)', 'aussen', projekt.aussen, aussen?.name)}
    </Seite>
  )
}
