import React, { useMemo, useRef, useState } from 'react'
import { Alert, PanResponder, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native'
import type { ViewShotRef } from 'react-native-view-shot'
import { FotoSzene, KAELTE_FARBE, KONDENSAT_FARBE, SEITENVERHAELTNIS } from '../components/FotoSzene'
import { Knopf, Leise, Seite } from '../components/ui'
import { sichereBild } from '../storage/bilder'
import { useProjekt, useStore } from '../store/AppStore'
import { farben } from '../theme'
import type { FotoSzene as Szene, Strich } from '../types'
import type { Props } from './typen'

const begrenze = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const abstand = (t: readonly { pageX: number; pageY: number }[]) => Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY)
const winkel = (t: readonly { pageX: number; pageY: number }[]) => (Math.atan2(t[1].pageY - t[0].pageY, t[1].pageX - t[0].pageX) * 180) / Math.PI

// Schritt 5 (modus "geraet"): Gerät verschieben, skalieren, drehen.
// Schritt 6 (modus "leitung"): Leitung und Kondensat einzeichnen, Wanddurchbruch markieren.
export default function FotoEditorScreen({ navigation, route }: Props<'FotoEditor'>) {
  const { projektId, ziel, modus } = route.params
  const { projekt } = useProjekt(projektId)
  const { daten, speichereProjekt, speichereRaum } = useStore()
  const { width } = useWindowDimensions()
  const breite = width - 32
  const hoehe = breite * SEITENVERHAELTNIS

  const raum = projekt?.raeume.find(r => r.id === ziel)
  const start = ziel === 'aussen' ? projekt?.aussen : raum?.innen
  const geraet = daten.geraete.find(g => g.id === (ziel === 'aussen' ? projekt?.aussengeraetId : raum?.geraetId))

  const [szene, setSzene] = useState<Szene | undefined>(start)
  const szeneRef = useRef(szene)
  szeneRef.current = szene
  const aenderung = (teil: Partial<Szene>) => setSzene(s => (s ? { ...s, ...teil } : s))
  const shot = useRef<ViewShotRef>(null)
  const [werkzeug, setWerkzeug] = useState<'kaeltemittel' | 'kondensat' | 'durchbruch'>('kaeltemittel')
  const werkzeugRef = useRef(werkzeug)
  werkzeugRef.current = werkzeug

  // Gestenzustand: Ausgangswerte zu Beginn einer Ein- oder Zwei-Finger-Geste.
  const geste = useRef({ finger: 0, x: 0, y: 0, dx: 0, dy: 0, skal: 1, rot: 0, dist: 1, wink: 0 })

  const punktAus = (e: GestureResponderEvent) => ({
    x: begrenze(e.nativeEvent.locationX / breite, 0, 1),
    y: begrenze(e.nativeEvent.locationY / hoehe, 0, 1),
  })

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: e => {
          const s = szeneRef.current
          if (!s) return
          if (modus === 'leitung') {
            const p = punktAus(e)
            if (werkzeugRef.current === 'durchbruch') {
              aenderung({ durchbruch: p })
            } else {
              const strich: Strich = { art: werkzeugRef.current as Strich['art'], punkte: [p] }
              setSzene({ ...s, striche: [...s.striche, strich] })
            }
          }
        },
        onPanResponderMove: (e, g) => {
          const s = szeneRef.current
          if (!s) return
          if (modus === 'leitung') {
            const p = punktAus(e)
            if (werkzeugRef.current === 'durchbruch') return aenderung({ durchbruch: p })
            const striche = s.striche.slice()
            const letzter = striche[striche.length - 1]
            if (letzter) striche[striche.length - 1] = { ...letzter, punkte: [...letzter.punkte, p] }
            return setSzene({ ...s, striche })
          }
          // Gerät bewegen: bei jedem Wechsel der Fingerzahl neu ansetzen.
          const t = e.nativeEvent.touches
          const ge = geste.current
          if (t.length !== ge.finger) {
            Object.assign(ge, { finger: t.length, x: s.x, y: s.y, dx: g.dx, dy: g.dy, skal: s.skalierung, rot: s.drehung })
            if (t.length >= 2) Object.assign(ge, { dist: Math.max(abstand(t), 1), wink: winkel(t) })
            return
          }
          if (t.length >= 2) {
            aenderung({
              skalierung: begrenze(ge.skal * (abstand(t) / ge.dist), 0.2, 4),
              drehung: ge.rot + (winkel(t) - ge.wink),
            })
          } else {
            aenderung({ x: begrenze(ge.x + (g.dx - ge.dx) / breite, 0, 1), y: begrenze(ge.y + (g.dy - ge.dy) / hoehe, 0, 1) })
          }
        },
        onPanResponderRelease: () => { geste.current.finger = 0 },
        onPanResponderTerminate: () => { geste.current.finger = 0 },
      }),
    [modus, breite, hoehe],
  )

  if (!projekt || !szene) return <Seite><Leise>Kein Foto vorhanden.</Leise></Seite>

  const speichern = async () => {
    try {
      const roh = await shot.current?.capture?.()
      const render = roh ? await sichereBild(roh, 'jpg') : szene.render
      const fertig: Szene = { ...szene, geraetId: geraet?.id, render }
      if (ziel === 'aussen') speichereProjekt({ ...projekt, aussen: fertig })
      else if (raum) speichereRaum(projektId, { ...raum, innen: fertig })
      navigation.goBack()
    } catch {
      Alert.alert('Speichern fehlgeschlagen', 'Das Bild konnte nicht erzeugt werden. Bitte versuche es erneut.')
    }
  }

  const feinschritt = (teil: Partial<Szene>) => aenderung(teil)
  const stift = (art: typeof werkzeug, text: string, farbe: string) => (
    <Knopf key={art} text={text} variante={werkzeug === art ? 'primaer' : 'sekundaer'} onPress={() => setWerkzeug(art)} style={{ flex: 1, borderColor: farbe, minHeight: 48 }} />
  )

  return (
    <Seite unten={<Knopf text="Fertig und speichern" onPress={speichern} />}>
      <View style={{ alignSelf: 'center' }}>
        <FotoSzene ref={shot} szene={szene} geraet={geraet} breite={breite}>
          <View style={{ position: 'absolute', left: 0, top: 0, width: breite, height: hoehe }} {...pan.panHandlers} />
        </FotoSzene>
      </View>

      {modus === 'geraet' ? (
        <View style={{ marginTop: 14, gap: 8 }}>
          <Leise>Ziehen = verschieben · zwei Finger = vergrößern und drehen</Leise>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Knopf variante="sekundaer" text="Kleiner" style={{ flex: 1 }} onPress={() => feinschritt({ skalierung: Math.max(0.2, szene.skalierung * 0.9) })} />
            <Knopf variante="sekundaer" text="Größer" style={{ flex: 1 }} onPress={() => feinschritt({ skalierung: Math.min(4, szene.skalierung * 1.1) })} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Knopf variante="sekundaer" text="↺ Drehen" style={{ flex: 1 }} onPress={() => feinschritt({ drehung: szene.drehung - 5 })} />
            <Knopf variante="sekundaer" text="↻ Drehen" style={{ flex: 1 }} onPress={() => feinschritt({ drehung: szene.drehung + 5 })} />
          </View>
        </View>
      ) : (
        <View style={{ marginTop: 14, gap: 8 }}>
          <Leise>Wähle ein Werkzeug und zeichne mit dem Finger auf das Foto.</Leise>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {stift('kaeltemittel', 'Kältemittel', KAELTE_FARBE)}
            {stift('kondensat', 'Kondensat', KONDENSAT_FARBE)}
            {stift('durchbruch', 'Durchbruch', farben.akzent)}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Knopf variante="sekundaer" text="Letzten Strich zurück" style={{ flex: 1 }} onPress={() => aenderung({ striche: szene.striche.slice(0, -1) })} />
            <Knopf variante="gefahr" text="Alles löschen" style={{ flex: 1 }} onPress={() => aenderung({ striche: [], durchbruch: undefined })} />
          </View>
          <Text style={{ color: farben.textLeise }}>Rot = Kältemittelleitung, blau gestrichelt = Kondensatablauf, orange = Wanddurchbruch.</Text>
        </View>
      )}
    </Seite>
  )
}
