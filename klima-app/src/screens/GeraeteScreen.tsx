import React, { useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import { TYP_NAMEN, bildFuer } from '../components/geraeteBild'
import { Auswahl, Fortschritt, Karte, Knopf, Leise, Seite, Titel } from '../components/ui'
import { berechneGesamt, berechneRaum, passtZuLeistung } from '../logic/kuehllast'
import { euro } from '../logic/kosten'
import { useProjekt, useStore } from '../store/AppStore'
import { farben } from '../theme'
import type { GeraeteTyp, Geraet, Raum } from '../types'
import type { Props } from './typen'

const INNEN: GeraeteTyp[] = ['wand', 'kassette', 'truhe', 'kanal']
const ALLE = 'Alle'

// Schritt 4: Geräte aus dem Katalog wählen. Passende Geräte sind hervorgehoben.
export default function GeraeteScreen({ navigation, route }: Props<'Geraete'>) {
  const { projektId } = route.params
  const { projekt } = useProjekt(projektId)
  const { daten, speichereProjekt, speichereRaum } = useStore()
  const [filter, setFilter] = useState<string>(ALLE)
  if (!projekt) return null

  const typNamen = Object.values(TYP_NAMEN)
  const gesamt = berechneGesamt(projekt.raeume)

  const liste = (nutzbar: (g: Geraet) => boolean, kw: number) =>
    daten.geraete
      .filter(nutzbar)
      .filter(g => filter === ALLE || TYP_NAMEN[g.typ] === filter)
      .sort((a, b) => a.kuehlleistung - b.kuehlleistung)
      .map(g => ({ g, passt: passtZuLeistung(g, kw) }))

  const zeile = (g: Geraet, passt: boolean, gewaehlt: boolean, onPress: () => void) => (
    <Pressable key={g.id} onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, marginBottom: 8, borderWidth: 2, borderColor: gewaehlt ? farben.haupt : passt ? farben.erfolg : farben.rand, backgroundColor: gewaehlt ? '#E8F1FB' : '#fff' }}>
        <Image source={bildFuer(g)} style={{ width: 64, height: 64 }} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 16 }}>{g.name}</Text>
          <Leise>{g.hersteller} · {TYP_NAMEN[g.typ]} · {String(g.kuehlleistung).replace('.', ',')} kW kühlen</Leise>
          <Text style={{ fontWeight: '700' }}>{euro(g.preis)} netto</Text>
          {passt ? <Text style={{ color: farben.erfolg, fontWeight: '700' }}>Passt zur berechneten Leistung</Text> : null}
        </View>
      </View>
    </Pressable>
  )

  const fuerRaum = (r: Raum) => {
    const kw = berechneRaum(r).kw
    return (
      <Karte key={r.id}>
        <Titel>{r.name}</Titel>
        <Leise>Benötigt ca. {kw.toFixed(1).replace('.', ',')} kW</Leise>
        {liste(g => INNEN.includes(g.typ), kw).map(({ g, passt }) =>
          zeile(g, passt, r.geraetId === g.id, () => speichereRaum(projektId, { ...r, geraetId: r.geraetId === g.id ? undefined : g.id })),
        )}
      </Karte>
    )
  }

  const aussenKw = gesamt.istMultisplit ? gesamt.multisplitKw : gesamt.summeKw
  return (
    <Seite unten={<Knopf text="Weiter: Visualisierung auf Foto" onPress={() => navigation.navigate('Foto', { projektId })} />}>
      <Fortschritt schritt={4} />
      <Auswahl label="Typ filtern" wert={filter} optionen={[ALLE, ...typNamen]} onChange={setFilter} />
      {projekt.raeume.map(fuerRaum)}
      <Karte>
        <Titel>{gesamt.istMultisplit ? 'Multisplit-Außengerät' : 'Außengerät'}</Titel>
        <Leise>Benötigt ca. {aussenKw.toFixed(1).replace('.', ',')} kW</Leise>
        {liste(g => g.typ === 'aussen' || g.typ === 'multisplit', aussenKw).map(({ g, passt }) =>
          zeile(g, passt, projekt.aussengeraetId === g.id, () =>
            speichereProjekt({ ...projekt, aussengeraetId: projekt.aussengeraetId === g.id ? undefined : g.id }),
          ),
        )}
      </Karte>
    </Seite>
  )
}
