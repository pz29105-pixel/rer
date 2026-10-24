import React, { useState } from 'react'
import { ActivityIndicator, Alert, Text } from 'react-native'
import { Fortschritt, Karte, Knopf, Leise, Seite } from '../components/ui'
import { berechneKosten, euro } from '../logic/kosten'
import { erzeugePdf, teilePdf } from '../pdf/angebot'
import { useProjekt, useStore } from '../store/AppStore'
import { farben } from '../theme'
import type { Props } from './typen'

// Schritt 8: PDF erzeugen und teilen.
export default function AngebotScreen({ route }: Props<'Angebot'>) {
  const { projekt, kunde } = useProjekt(route.params.projektId)
  const { daten } = useStore()
  const [arbeitet, setArbeitet] = useState(false)
  const [pfad, setPfad] = useState<string>()
  if (!projekt || !kunde) return null
  const k = berechneKosten(projekt, daten.geraete, daten.einstellungen)

  const erzeuge = async (teilen: boolean) => {
    setArbeitet(true)
    try {
      const p = pfad && !teilen ? pfad : await erzeugePdf(projekt, kunde, daten)
      setPfad(p)
      if (teilen) await teilePdf(p)
    } catch (err) {
      Alert.alert('PDF nicht möglich', (err as Error).message)
    } finally {
      setArbeitet(false)
    }
  }

  return (
    <Seite
      unten={
        arbeitet ? (
          <ActivityIndicator size="large" color={farben.haupt} />
        ) : (
          <>
            <Knopf text="PDF erstellen und teilen" onPress={() => erzeuge(true)} />
            <Knopf variante="sekundaer" text="Nur PDF erstellen" onPress={() => erzeuge(false)} />
          </>
        )
      }
    >
      <Fortschritt schritt={8} />
      <Karte>
        <Text style={{ fontSize: 18, fontWeight: '800' }}>Angebot {projekt.angebotsnummer}</Text>
        <Leise>{kunde.name} · {projekt.raeume.length} Raum/Räume</Leise>
        <Text style={{ fontSize: 28, fontWeight: '800', color: farben.haupt }}>{euro(k.brutto)}</Text>
        <Leise>brutto, inklusive {k.mwstSatz} % MwSt. · gültig {daten.einstellungen.texte.gueltigkeitTage} Tage</Leise>
      </Karte>
      <Leise>
        Das PDF enthält Logo, Firmen- und Kundendaten, Raumdaten, berechnete Leistung, Geräte, bearbeitete Fotos, Kostenaufstellung, Gültigkeit und ein Unterschriftsfeld.
        Über „Teilen“ sendest du es per E-Mail oder WhatsApp oder sicherst es in Dateien.
      </Leise>
      {pfad ? <Text style={{ color: farben.erfolg, fontWeight: '700' }}>PDF wurde erstellt.</Text> : null}
    </Seite>
  )
}
