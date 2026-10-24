import React from 'react'
import { Text } from 'react-native'
import { SCHRITTE, Karte, Leise, Seite, Titel } from '../components/ui'
import { useProjekt } from '../store/AppStore'
import { farben } from '../theme'
import type { Props } from './typen'

// Übersicht eines Projekts: springt in jeden der acht Schritte.
export default function ProjektScreen({ navigation, route }: Props<'Projekt'>) {
  const { projektId } = route.params
  const { projekt, kunde } = useProjekt(projektId)
  if (!projekt) return null
  const r = projekt.raeume
  const status = [
    kunde ? kunde.name : 'fehlt',
    r.length ? `${r.length} Raum/Räume` : 'noch leer',
    r.length ? 'berechnet' : '–',
    r.every(x => x.geraetId) && r.length ? 'gewählt' : 'offen',
    r.some(x => x.innen) ? 'Fotos vorhanden' : 'offen',
    r.some(x => x.leitungslaenge > 0) ? 'erfasst' : 'offen',
    'Schätzung',
    'PDF erstellen',
  ]
  const ziele = ['KundeForm', 'Raeume', 'Leistung', 'Geraete', 'Foto', 'Leitung', 'Kosten', 'Angebot'] as const
  return (
    <Seite>
      <Titel>{projekt.angebotsnummer}</Titel>
      <Leise>{kunde?.name}</Leise>
      {SCHRITTE.map((name, i) => (
        <Karte
          key={name}
          onPress={() => {
            const ziel = ziele[i]
            if (ziel === 'KundeForm') navigation.navigate('KundeForm', { kundeId: projekt.kundeId })
            else navigation.navigate(ziel, { projektId })
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: farben.text }}>{i + 1}. {name}</Text>
          <Leise>{status[i]}</Leise>
        </Karte>
      ))}
    </Seite>
  )
}
