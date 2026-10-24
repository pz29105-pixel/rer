import React from 'react'
import { Switch, Text, View } from 'react-native'
import { Fortschritt, Karte, Knopf, Leise, Seite, Titel } from '../components/ui'
import { berechneKosten, euro } from '../logic/kosten'
import { useProjekt, useStore } from '../store/AppStore'
import { farben } from '../theme'
import type { Props } from './typen'

// Schritt 7: Kostenschätzung mit Netto, MwSt. und Brutto.
export default function KostenScreen({ navigation, route }: Props<'Kosten'>) {
  const { projektId } = route.params
  const { projekt } = useProjekt(projektId)
  const { daten, speichereProjekt } = useStore()
  if (!projekt) return null
  const k = berechneKosten(projekt, daten.geraete, daten.einstellungen)
  const schalte = (id: string, an: boolean) =>
    speichereProjekt({ ...projekt, zusatzIds: an ? [...projekt.zusatzIds, id] : projekt.zusatzIds.filter(z => z !== id) })
  const zeile = (links: string, rechts: string, fett = false) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 12 }}>
      <Text style={{ flex: 1, color: farben.text, fontWeight: fett ? '800' : '400', fontSize: fett ? 18 : 15 }}>{links}</Text>
      <Text style={{ color: farben.text, fontWeight: fett ? '800' : '600', fontSize: fett ? 18 : 15 }}>{rechts}</Text>
    </View>
  )
  return (
    <Seite unten={<Knopf text="Weiter: Angebot als PDF" onPress={() => navigation.navigate('Angebot', { projektId })} />}>
      <Fortschritt schritt={7} />
      <Karte>
        <Titel>Zusatzleistungen</Titel>
        {daten.einstellungen.zusatzleistungen.map(z => (
          <View key={z.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 }}>
            <Text style={{ flex: 1, fontSize: 16 }}>{z.name} ({euro(z.preis)})</Text>
            <Switch value={projekt.zusatzIds.includes(z.id)} onValueChange={v => schalte(z.id, v)} trackColor={{ true: farben.haupt }} />
          </View>
        ))}
      </Karte>
      <Karte>
        <Titel>Kostenaufstellung</Titel>
        {k.positionen.map((p, i) => <View key={i}>{zeile(`${p.menge > 1 ? p.menge + ' × ' : ''}${p.text}`, euro(p.summe))}</View>)}
        <View style={{ height: 1, backgroundColor: farben.rand, marginVertical: 8 }} />
        {zeile('Netto', euro(k.netto))}
        {zeile(`MwSt. ${k.mwstSatz} %`, euro(k.mwst))}
        {zeile('Brutto', euro(k.brutto), true)}
      </Karte>
      <Leise>Alle Preise lassen sich unter Einstellungen → Preise anpassen.</Leise>
    </Seite>
  )
}
