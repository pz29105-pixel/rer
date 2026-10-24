import React from 'react'
import { Alert, Text } from 'react-native'
import { Fortschritt, Karte, Knopf, Leise, Seite } from '../components/ui'
import { useProjekt, useStore } from '../store/AppStore'
import { farben } from '../theme'
import type { Props } from './typen'

// Schritt 2: Liste der Räume eines Projekts.
export default function RaeumeScreen({ navigation, route }: Props<'Raeume'>) {
  const { projektId } = route.params
  const { projekt } = useProjekt(projektId)
  const { loescheRaum } = useStore()
  if (!projekt) return null
  return (
    <Seite
      unten={
        <>
          <Knopf text="Weiter: Kühlleistung berechnen" deaktiviert={projekt.raeume.length === 0} onPress={() => navigation.navigate('Leistung', { projektId })} />
          <Knopf variante="sekundaer" text="Raum hinzufügen" onPress={() => navigation.navigate('RaumForm', { projektId })} />
        </>
      }
    >
      <Fortschritt schritt={2} />
      {projekt.raeume.length === 0 ? <Leise>Noch kein Raum erfasst. Füge unten den ersten Raum hinzu.</Leise> : null}
      {projekt.raeume.map(r => (
        <Karte
          key={r.id}
          onPress={() => navigation.navigate('RaumForm', { projektId, raumId: r.id })}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: farben.text }}>{r.name}</Text>
          <Leise>
            {r.laenge} × {r.breite} × {r.hoehe} m · {r.nutzung} · {r.himmelsrichtung}
          </Leise>
          <Text
            style={{ color: farben.fehler, fontWeight: '600' }}
            onPress={() => Alert.alert('Raum löschen?', r.name, [
              { text: 'Abbrechen', style: 'cancel' },
              { text: 'Löschen', style: 'destructive', onPress: () => loescheRaum(projektId, r.id) },
            ])}
          >
            Löschen
          </Text>
        </Karte>
      ))}
    </Seite>
  )
}
