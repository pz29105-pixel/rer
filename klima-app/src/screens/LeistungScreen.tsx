import React from 'react'
import { Text } from 'react-native'
import { Fortschritt, Karte, Knopf, Leise, Seite, Titel } from '../components/ui'
import { berechneGesamt, berechneRaum } from '../logic/kuehllast'
import { useProjekt } from '../store/AppStore'
import { farben } from '../theme'
import type { Props } from './typen'

const gross = { fontSize: 32, fontWeight: '800' as const, color: farben.haupt }

// Schritt 3: berechnete Kühlleistung je Raum und insgesamt.
export default function LeistungScreen({ navigation, route }: Props<'Leistung'>) {
  const { projektId } = route.params
  const { projekt } = useProjekt(projektId)
  if (!projekt) return null
  const gesamt = berechneGesamt(projekt.raeume)
  return (
    <Seite unten={<Knopf text="Weiter: Gerät auswählen" onPress={() => navigation.navigate('Geraete', { projektId })} />}>
      <Fortschritt schritt={3} />
      {projekt.raeume.map(r => {
        const k = berechneRaum(r)
        return (
          <Karte key={r.id}>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>{r.name}</Text>
            <Text style={gross}>{k.kw.toFixed(1).replace('.', ',')} kW</Text>
            <Leise>Empfohlene Gerätegröße: {String(k.stufe).replace('.', ',')} kW</Leise>
            <Leise>
              Grundlast {Math.round(k.teile.grundlast)} W · Fenster {Math.round(k.teile.fenster)} W · Personen {Math.round(k.teile.personen)} W · Nutzung {k.teile.nutzung} W
              {k.teile.dachzuschlag ? ` · Dachgeschoss +${Math.round(k.teile.dachzuschlag)} W` : ''}
            </Leise>
          </Karte>
        )
      })}
      {gesamt.istMultisplit ? (
        <Karte>
          <Titel>Gesamt und Multisplit</Titel>
          <Text style={gross}>{gesamt.summeKw.toFixed(1).replace('.', ',')} kW</Text>
          <Leise>
            Summe aller Räume. Empfehlung: Multisplit-Außengerät mit ca. {gesamt.multisplitKw.toFixed(1).replace('.', ',')} kW
            (Gleichzeitigkeit 80 %) und ein Innengerät je Raum.
          </Leise>
        </Karte>
      ) : null}
      <Leise>
        Hinweis: Dies ist eine Schätzung per Faustformel und ersetzt keine normgerechte Heiz- bzw. Kühllastberechnung.
      </Leise>
    </Seite>
  )
}
