import React, { forwardRef } from 'react'
import { Image, StyleSheet, View, type LayoutChangeEvent } from 'react-native'
import Svg, { Circle, Line, Polyline } from 'react-native-svg'
import ViewShot, { type ViewShotRef } from 'react-native-view-shot'
import { farben } from '../theme'
import type { FotoSzene as Szene, Geraet } from '../types'
import { bildFuer } from './geraeteBild'

export const SEITENVERHAELTNIS = 4 / 3 // Höhe : Breite des Bildbereichs
export const KAELTE_FARBE = '#E53935'
export const KONDENSAT_FARBE = '#1E88E5'

interface Props {
  szene: Szene
  geraet?: Geraet
  breite: number
  /** Überlagerung für Touch-Eingaben der Editoren (liegt über allem, wird nicht mitfotografiert). */
  children?: React.ReactNode
  nurLesen?: boolean
}

/**
 * Zeigt Foto, aufgelegtes Gerät, Leitungsstriche und Wanddurchbruch.
 * Die ViewShot-Referenz erzeugt daraus das fertige Bild für das PDF.
 */
export const FotoSzene = forwardRef<ViewShotRef, Props>(function FotoSzene({ szene, geraet, breite, children }, ref) {
  const hoehe = breite * SEITENVERHAELTNIS
  const bild = bildFuer(geraet)
  const geraetBreite = breite * 0.4 * szene.skalierung
  return (
    <View style={{ width: breite, height: hoehe }}>
      <ViewShot ref={ref} options={{ format: 'jpg', quality: 0.9 }} style={{ width: breite, height: hoehe, backgroundColor: '#000' }}>
        <Image source={{ uri: szene.foto }} style={{ width: breite, height: hoehe }} resizeMode="cover" />
        {bild ? (
          <Image
            source={bild}
            resizeMode="contain"
            style={{
              position: 'absolute',
              width: geraetBreite,
              height: geraetBreite,
              left: szene.x * breite - geraetBreite / 2,
              top: szene.y * hoehe - geraetBreite / 2,
              transform: [{ rotate: `${szene.drehung}deg` }],
            }}
          />
        ) : null}
        <Svg width={breite} height={hoehe} style={StyleSheet.absoluteFill} pointerEvents="none">
          {szene.striche.map((st, i) => (
            <Polyline
              key={i}
              points={st.punkte.map(p => `${p.x * breite},${p.y * hoehe}`).join(' ')}
              fill="none"
              stroke={st.art === 'kaeltemittel' ? KAELTE_FARBE : KONDENSAT_FARBE}
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={st.art === 'kondensat' ? '12,8' : undefined}
            />
          ))}
          {szene.durchbruch ? (
            <>
              <Circle cx={szene.durchbruch.x * breite} cy={szene.durchbruch.y * hoehe} r={14} fill="rgba(255,255,255,0.35)" stroke={farben.akzent} strokeWidth={4} />
              <Line x1={szene.durchbruch.x * breite - 8} y1={szene.durchbruch.y * hoehe} x2={szene.durchbruch.x * breite + 8} y2={szene.durchbruch.y * hoehe} stroke={farben.akzent} strokeWidth={3} />
            </>
          ) : null}
        </Svg>
      </ViewShot>
      {children}
    </View>
  )
})

/** Hilfsfunktion: Breite des Bildbereichs aus dem Layout ermitteln. */
export const messeBreite = (set: (b: number) => void) => (e: LayoutChangeEvent) => set(e.nativeEvent.layout.width)
