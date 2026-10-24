import React from 'react'
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { farben, mass } from '../theme'

/** Seite mit Scrollbereich und fester Aktionsleiste unten (gut mit dem Daumen erreichbar). */
export function Seite({ children, unten }: { children: React.ReactNode; unten?: React.ReactNode }) {
  return (
    <SafeAreaView style={s.seite} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.inhalt} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {unten ? <View style={s.leiste}>{unten}</View> : null}
    </SafeAreaView>
  )
}

type Variante = 'primaer' | 'sekundaer' | 'gefahr'

export function Knopf(props: { text: string; onPress: () => void; variante?: Variante; deaktiviert?: boolean; style?: StyleProp<ViewStyle> }) {
  const v = props.variante ?? 'primaer'
  const bg = v === 'primaer' ? farben.haupt : v === 'gefahr' ? farben.fehler : farben.karte
  const fg = v === 'sekundaer' ? farben.haupt : '#fff'
  return (
    <Pressable
      accessibilityRole="button"
      disabled={props.deaktiviert}
      onPress={props.onPress}
      style={({ pressed }) => [
        s.knopf,
        { backgroundColor: bg, borderColor: v === 'sekundaer' ? farben.haupt : bg, opacity: props.deaktiviert ? 0.4 : pressed ? 0.8 : 1 },
        props.style,
      ]}
    >
      <Text style={[s.knopfText, { color: fg }]}>{props.text}</Text>
    </Pressable>
  )
}

export function Karte({ children, onPress, style }: { children: React.ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  const inhalt = <View style={[s.karte, style]}>{children}</View>
  return onPress ? <Pressable onPress={onPress}>{inhalt}</Pressable> : inhalt
}

export const Titel = ({ children }: { children: React.ReactNode }) => <Text style={s.titel}>{children}</Text>
export const Leise = ({ children }: { children: React.ReactNode }) => <Text style={s.leise}>{children}</Text>

/** Beschriftetes Eingabefeld. Zahlenfelder nehmen auch Komma als Dezimaltrenner. */
export function Feld(props: TextInputProps & { label: string }) {
  const { label, style, ...rest } = props
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput placeholderTextColor="#9AA4B2" style={[s.feld, rest.multiline && { height: 100, textAlignVertical: 'top', paddingTop: 12 }, style]} {...rest} />
    </View>
  )
}

export function ZahlFeld(props: { label: string; wert: number; onChange: (n: number) => void; einheit?: string }) {
  const [text, setText] = React.useState(props.wert ? String(props.wert).replace('.', ',') : '')
  return (
    <Feld
      label={props.einheit ? `${props.label} (${props.einheit})` : props.label}
      keyboardType="decimal-pad"
      value={text}
      onChangeText={t => {
        setText(t)
        const n = parseFloat(t.replace(',', '.'))
        props.onChange(Number.isFinite(n) ? n : 0)
      }}
    />
  )
}

/** Auswahl über große Chips. */
export function Auswahl<T extends string>(props: { label: string; wert: T; optionen: readonly T[]; onChange: (w: T) => void }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{props.label}</Text>
      <View style={s.chips}>
        {props.optionen.map(o => (
          <Pressable key={o} onPress={() => props.onChange(o)} style={[s.chip, o === props.wert && s.chipAktiv]}>
            <Text style={[s.chipText, o === props.wert && { color: '#fff' }]}>{o}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

export const SCHRITTE = ['Kunde', 'Räume', 'Leistung', 'Gerät', 'Foto', 'Leitung', 'Kosten', 'Angebot']

/** Fortschrittsanzeige über die acht Schritte. */
export function Fortschritt({ schritt }: { schritt: number }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={s.balken}>
        {SCHRITTE.map((_, i) => (
          <View key={i} style={[s.segment, i < schritt && { backgroundColor: farben.haupt }]} />
        ))}
      </View>
      <Text style={s.schrittText}>
        Schritt {schritt} von {SCHRITTE.length}: {SCHRITTE[schritt - 1]}
      </Text>
    </View>
  )
}

const s = StyleSheet.create({
  seite: { flex: 1, backgroundColor: farben.hintergrund },
  inhalt: { padding: mass.rand, paddingBottom: 32 },
  leiste: { padding: mass.rand, gap: 10, backgroundColor: farben.karte, borderTopWidth: 1, borderTopColor: farben.rand },
  knopf: { minHeight: mass.buttonHoehe, borderRadius: mass.radius, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  knopfText: { fontSize: 18, fontWeight: '700' },
  karte: { backgroundColor: farben.karte, borderRadius: mass.radius, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: farben.rand },
  titel: { fontSize: 22, fontWeight: '800', color: farben.text, marginBottom: 6 },
  leise: { fontSize: 14, color: farben.textLeise, marginBottom: 10 },
  label: { fontSize: 14, fontWeight: '600', color: farben.textLeise, marginBottom: 6 },
  feld: { height: mass.feldHoehe, borderRadius: 12, borderWidth: 1, borderColor: farben.rand, backgroundColor: '#fff', paddingHorizontal: 14, fontSize: 17, color: farben.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 46, paddingHorizontal: 16, borderRadius: 23, borderWidth: 1, borderColor: farben.rand, backgroundColor: '#fff', justifyContent: 'center' },
  chipAktiv: { backgroundColor: farben.haupt, borderColor: farben.haupt },
  chipText: { fontSize: 16, color: farben.text, fontWeight: '600' },
  balken: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 8, borderRadius: 4, backgroundColor: farben.rand },
  schrittText: { marginTop: 6, fontSize: 14, fontWeight: '700', color: farben.haupt },
})
