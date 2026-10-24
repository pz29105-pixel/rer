import { useMemo, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  Image,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import WandGeraet from './WandGeraet';
import { abstand, leitungsPfad, pfadLaenge, pinchSkala, Punkt } from './geometrie';

const BASIS_BREITE = 160;
// Reale Breite des Wandgeräts in Metern, dient als Maßstab für die Leitungslänge.
const GERAET_BREITE_M = 0.8;

type Modus = 'geraet' | 'leitung';

type Props = { fotoUri: string; onNeuesFoto: () => void };

function fingerAbstand(e: GestureResponderEvent): number {
  const [a, b] = e.nativeEvent.touches;
  return abstand({ x: a.pageX, y: a.pageY }, { x: b.pageX, y: b.pageY });
}

export default function Editor({ fotoUri, onNeuesFoto }: Props) {
  const [modus, setModus] = useState<Modus>('geraet');
  const [position, setPosition] = useState<Punkt>({ x: 40, y: 80 });
  const [skala, setSkala] = useState(1);
  const [leitung, setLeitung] = useState<Punkt[]>([]);

  // PanResponder wird nur einmal erzeugt, darum liest er die aktuellen Werte aus Refs.
  const aktuell = useRef({ position, skala });
  aktuell.current = { position, skala };
  const geste = useRef({ start: position, startSkala: 1, startAbstand: 0, finger: 0, dx: 0, dy: 0 });

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          geste.current.finger = 0;
        },
        onPanResponderMove: (e, g) => {
          const finger = e.nativeEvent.touches.length;
          const s = geste.current;
          // Bei wechselnder Fingerzahl neu ansetzen, damit das Gerät nicht springt.
          if (finger !== s.finger) {
            s.finger = finger;
            s.start = aktuell.current.position;
            s.startSkala = aktuell.current.skala;
            s.dx = g.dx;
            s.dy = g.dy;
            s.startAbstand = finger >= 2 ? fingerAbstand(e) : 0;
            return;
          }
          if (finger >= 2) {
            setSkala(pinchSkala(s.startSkala, s.startAbstand, fingerAbstand(e)));
          } else {
            setPosition({ x: s.start.x + g.dx - s.dx, y: s.start.y + g.dy - s.dy });
          }
        },
      }),
    [],
  );

  const [flaeche, setFlaeche] = useState({ breite: 0, hoehe: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setFlaeche({ breite: width, hoehe: height });
  };

  const punktSetzen = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    setLeitung((alt) => [...alt, { x: locationX, y: locationY }]);
  };

  const geraetBreite = BASIS_BREITE * skala;
  const meterProPunkt = GERAET_BREITE_M / geraetBreite;
  const laengeM = pfadLaenge(leitung) * meterProPunkt;

  return (
    <View style={styles.container}>
      <View style={styles.flaeche} onLayout={onLayout}>
        <Image source={{ uri: fotoUri }} style={StyleSheet.absoluteFill} resizeMode="contain" />

        {modus === 'leitung' && <Pressable style={StyleSheet.absoluteFill} onPress={punktSetzen} />}

        <Svg
          width={flaeche.breite}
          height={flaeche.hoehe}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          {leitung.length > 1 && (
            <Path
              d={leitungsPfad(leitung)}
              stroke="#ffffff"
              strokeWidth={6}
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="none"
            />
          )}
          {leitung.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={5} fill="#1e88e5" stroke="#ffffff" strokeWidth={2} />
          ))}
        </Svg>

        <View
          {...(modus === 'geraet' ? responder.panHandlers : {})}
          pointerEvents={modus === 'geraet' ? 'auto' : 'none'}
          style={[styles.geraet, { left: position.x, top: position.y }]}
        >
          <WandGeraet breite={geraetBreite} />
        </View>
      </View>

      <View style={styles.leiste}>
        <Text style={styles.hinweis}>
          {modus === 'geraet'
            ? 'Gerät mit einem Finger verschieben, mit zwei Fingern größer oder kleiner machen.'
            : `Tippen Sie Punkte für den Leitungsweg. Länge ca. ${laengeM.toFixed(1)} m`}
        </Text>
        <View style={styles.knoepfe}>
          <Knopf titel="Gerät" aktiv={modus === 'geraet'} onPress={() => setModus('geraet')} />
          <Knopf titel="Leitung" aktiv={modus === 'leitung'} onPress={() => setModus('leitung')} />
          {modus === 'leitung' && (
            <Knopf titel="Rückgängig" onPress={() => setLeitung((alt) => alt.slice(0, -1))} />
          )}
          <Knopf titel="Neues Foto" onPress={onNeuesFoto} />
        </View>
      </View>
    </View>
  );
}

function Knopf({ titel, aktiv, onPress }: { titel: string; aktiv?: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.knopf, aktiv && styles.knopfAktiv]} onPress={onPress}>
      <Text style={[styles.knopfText, aktiv && styles.knopfTextAktiv]}>{titel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  flaeche: { flex: 1, overflow: 'hidden' },
  geraet: { position: 'absolute' },
  leiste: { backgroundColor: '#fff', padding: 12, paddingBottom: 28, gap: 10 },
  hinweis: { fontSize: 14, color: '#333' },
  knoepfe: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  knopf: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e88e5',
  },
  knopfAktiv: { backgroundColor: '#1e88e5' },
  knopfText: { color: '#1e88e5', fontSize: 15, fontWeight: '600' },
  knopfTextAktiv: { color: '#fff' },
});
