import React, { useState } from 'react'
import { Alert, Switch, Text, View } from 'react-native'
import { Auswahl, Fortschritt, Knopf, Seite, ZahlFeld, Feld } from '../components/ui'
import { neueId, useStore } from '../store/AppStore'
import { farben } from '../theme'
import type { Daemmung, Himmelsrichtung, Nutzung, Raum } from '../types'
import type { Props } from './typen'

const RICHTUNGEN: readonly Himmelsrichtung[] = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW']
const DAEMMUNG: readonly Daemmung[] = ['gut', 'mittel', 'schlecht']
const NUTZUNGEN: readonly Nutzung[] = ['Schlafzimmer', 'Wohnzimmer', 'Büro', 'Küche', 'Serverraum', 'Sonstiges']

// Schritt 2: Raumdaten erfassen.
export default function RaumFormScreen({ navigation, route }: Props<'RaumForm'>) {
  const { projektId, raumId } = route.params
  const { daten, speichereRaum } = useStore()
  const vorhanden = daten.projekte.find(p => p.id === projektId)?.raeume.find(r => r.id === raumId)
  const [r, setR] = useState<Raum>(
    vorhanden ?? {
      id: neueId(), name: '', laenge: 0, breite: 0, hoehe: 2.5, fensterAnzahl: 1, fensterBreite: 1.2, fensterHoehe: 1.3,
      himmelsrichtung: 'S', daemmung: 'mittel', personen: 2, nutzung: 'Wohnzimmer', dachgeschoss: false,
      leitungslaenge: 0, wanddurchbruch: true,
    },
  )
  const set = (teil: Partial<Raum>) => setR(alt => ({ ...alt, ...teil }))

  const speichern = () => {
    if (!r.name.trim()) return Alert.alert('Raumname fehlt', 'Bitte gib dem Raum einen Namen.')
    if (r.laenge <= 0 || r.breite <= 0 || r.hoehe <= 0) return Alert.alert('Maße fehlen', 'Länge, Breite und Höhe müssen größer als 0 sein.')
    speichereRaum(projektId, r)
    navigation.goBack()
  }

  return (
    <Seite unten={<Knopf text="Raum speichern" onPress={speichern} />}>
      <Fortschritt schritt={2} />
      <Feld label="Raumname" value={r.name} onChangeText={t => set({ name: t })} placeholder="z. B. Wohnzimmer" />
      <ZahlFeld label="Länge" einheit="m" wert={r.laenge} onChange={n => set({ laenge: n })} />
      <ZahlFeld label="Breite" einheit="m" wert={r.breite} onChange={n => set({ breite: n })} />
      <ZahlFeld label="Höhe" einheit="m" wert={r.hoehe} onChange={n => set({ hoehe: n })} />
      <ZahlFeld label="Anzahl Fenster" wert={r.fensterAnzahl} onChange={n => set({ fensterAnzahl: Math.round(n) })} />
      <ZahlFeld label="Fensterbreite" einheit="m" wert={r.fensterBreite} onChange={n => set({ fensterBreite: n })} />
      <ZahlFeld label="Fensterhöhe" einheit="m" wert={r.fensterHoehe} onChange={n => set({ fensterHoehe: n })} />
      <Auswahl label="Himmelsrichtung der Fenster" wert={r.himmelsrichtung} optionen={RICHTUNGEN} onChange={w => set({ himmelsrichtung: w })} />
      <Auswahl label="Dämmung" wert={r.daemmung} optionen={DAEMMUNG} onChange={w => set({ daemmung: w })} />
      <ZahlFeld label="Anzahl Personen" wert={r.personen} onChange={n => set({ personen: Math.round(n) })} />
      <Auswahl label="Nutzung" wert={r.nutzung} optionen={NUTZUNGEN} onChange={w => set({ nutzung: w })} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 }}>
        <Text style={{ fontSize: 17, color: farben.text }}>Dachgeschoss</Text>
        <Switch value={r.dachgeschoss} onValueChange={v => set({ dachgeschoss: v })} trackColor={{ true: farben.haupt }} />
      </View>
    </Seite>
  )
}
