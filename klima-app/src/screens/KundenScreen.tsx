import React, { useLayoutEffect, useState } from 'react'
import { Pressable, Text } from 'react-native'
import { Feld, Karte, Knopf, Leise, Seite } from '../components/ui'
import { useStore } from '../store/AppStore'
import { farben } from '../theme'
import type { Props } from './typen'

// Startseite: alle bisherigen Kunden mit Suche. Von hier startet jede Beratung.
export default function KundenScreen({ navigation }: Props<'Kunden'>) {
  const { daten } = useStore()
  const [suche, setSuche] = useState('')

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => navigation.navigate('Einstellungen')} hitSlop={12}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Einstellungen</Text>
        </Pressable>
      ),
    })
  }, [navigation])

  const q = suche.trim().toLowerCase()
  const liste = daten.kunden
    .filter(k => !q || `${k.name} ${k.adresse} ${k.telefon} ${k.email}`.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))

  return (
    <Seite unten={<Knopf text="Neuer Kunde" onPress={() => navigation.navigate('KundeForm', {})} />}>
      <Feld label="Suche" placeholder="Name, Adresse, Telefon …" value={suche} onChangeText={setSuche} />
      {liste.length === 0 ? (
        <Leise>{daten.kunden.length === 0 ? 'Noch keine Kunden. Lege unten den ersten Kunden an.' : 'Kein Treffer.'}</Leise>
      ) : null}
      {liste.map(k => {
        const anzahl = daten.projekte.filter(p => p.kundeId === k.id).length
        return (
          <Karte key={k.id} onPress={() => navigation.navigate('KundeForm', { kundeId: k.id })}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: farben.text }}>{k.name}</Text>
            <Leise>{k.adresse || 'Keine Adresse'}</Leise>
            <Text style={{ color: farben.haupt, fontWeight: '600' }}>{anzahl === 1 ? '1 Projekt' : `${anzahl} Projekte`}</Text>
          </Karte>
        )
      })}
    </Seite>
  )
}
