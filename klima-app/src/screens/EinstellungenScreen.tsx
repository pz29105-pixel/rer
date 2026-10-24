import React from 'react'
import { Text } from 'react-native'
import { Karte, Leise, Seite } from '../components/ui'
import { farben } from '../theme'
import type { Props } from './typen'

const EINTRAEGE = [
  { ziel: 'Firma', titel: 'Firmendaten und Logo', info: 'Name, Adresse, Kontakt, Logo' },
  { ziel: 'Katalog', titel: 'Gerätekatalog', info: 'Geräte hinzufügen, ändern, löschen' },
  { ziel: 'Preise', titel: 'Preise und MwSt.', info: 'Leitung, Montage, Zusatzleistungen' },
  { ziel: 'Texte', titel: 'Angebotstexte', info: 'Einleitung, Schlusstext, Zahlung' },
] as const

export default function EinstellungenScreen({ navigation }: Props<'Einstellungen'>) {
  return (
    <Seite>
      {EINTRAEGE.map(e => (
        <Karte key={e.ziel} onPress={() => navigation.navigate(e.ziel)}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: farben.text }}>{e.titel}</Text>
          <Leise>{e.info}</Leise>
        </Karte>
      ))}
    </Seite>
  )
}
