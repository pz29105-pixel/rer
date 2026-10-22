import type { ReactNode } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type TextInputProps, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, space } from '../theme';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const insets = useSafeAreaInsets();
  const pad = { paddingBottom: insets.bottom + space.lg };
  return scroll ? (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.content, pad]}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[s.screen, s.content, pad]}>{children}</View>
  );
}

export const H1 = ({ children }: { children: ReactNode }) => <Text style={s.h1}>{children}</Text>;
export const H2 = ({ children }: { children: ReactNode }) => <Text style={s.h2}>{children}</Text>;
export const Muted = ({ children }: { children: ReactNode }) => <Text style={s.muted}>{children}</Text>;
export const Body = ({ children, style }: { children: ReactNode; style?: object }) =>
  <Text style={[s.body, style]}>{children}</Text>;

export function Button({
  title, onPress, kind = 'primary', busy, disabled, style,
}: {
  title: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger';
  busy?: boolean; disabled?: boolean; style?: ViewStyle;
}) {
  const off = busy || disabled;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        s.btn, kind === 'ghost' && s.btnGhost, kind === 'danger' && s.btnDanger,
        off && { opacity: 0.5 }, pressed && { opacity: 0.8 }, style,
      ]}>
      {busy ? (
        <ActivityIndicator color={kind === 'primary' ? colors.accentInk : colors.ink} />
      ) : (
        <Text style={[s.btnText, kind !== 'primary' && { color: kind === 'danger' ? colors.danger : colors.ink }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({
  label, value, onChangeText, suffix, ...rest
}: { label: string; value: string; onChangeText: (t: string) => void; suffix?: string } & TextInputProps) {
  return (
    <View style={{ marginBottom: space.md }}>
      <Text style={s.label}>{label}</Text>
      <View style={s.inputWrap}>
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={colors.muted}
          {...rest}
        />
        {suffix ? <Text style={s.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

/** Zahl aus Eingabefeld (Komma oder Punkt), sonst 0. */
export const num = (t: string) => {
  const n = parseFloat(t.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export function Card({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  const inner = <View style={s.card}>{children}</View>;
  return onPress ? <Pressable onPress={onPress}>{inner}</Pressable> : inner;
}

export function Stepper({
  label, value, onChange, min = 0, max = 99, step = 1, unit,
}: {
  label: string; value: number; onChange: (n: number) => void;
  min?: number; max?: number; step?: number; unit?: string;
}) {
  const set = (n: number) => onChange(Math.min(max, Math.max(min, Math.round(n * 100) / 100)));
  return (
    <View style={s.stepper}>
      <Text style={[s.body, { flex: 1 }]}>{label}</Text>
      <Pressable accessibilityLabel={label + ' weniger'} style={s.stepBtn} onPress={() => set(value - step)}>
        <Text style={s.stepTxt}>−</Text>
      </Pressable>
      <Text style={s.stepVal}>{String(value).replace('.', ',')}{unit ? ' ' + unit : ''}</Text>
      <Pressable accessibilityLabel={label + ' mehr'} style={s.stepBtn} onPress={() => set(value + step)}>
        <Text style={s.stepTxt}>+</Text>
      </Pressable>
    </View>
  );
}

export function Centered({ children }: { children: ReactNode }) {
  return <View style={[s.screen, { alignItems: 'center', justifyContent: 'center', padding: space.lg }]}>{children}</View>;
}

export function Loading() {
  return <Centered><ActivityIndicator color={colors.accent} /></Centered>;
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Centered>
      <Text style={[s.body, { color: colors.danger, textAlign: 'center', marginBottom: space.md }]}>{message}</Text>
      {onRetry ? <Button title="Nochmal versuchen" onPress={onRetry} kind="ghost" /> : null}
    </Centered>
  );
}

export function confirm(title: string, message: string, ok: string, onOk: () => void) {
  Alert.alert(title, message, [
    { text: 'Abbrechen', style: 'cancel' },
    { text: ok, style: 'destructive', onPress: onOk },
  ]);
}

export function showError(e: unknown) {
  Alert.alert('Das hat nicht geklappt', e instanceof Error ? e.message : String(e));
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg },
  h1: { fontFamily: fonts.serifBold, fontSize: 34, color: colors.ink, marginBottom: space.sm, letterSpacing: 0.2 },
  h2: { fontFamily: fonts.serif, fontSize: 24, color: colors.ink, marginTop: space.lg, marginBottom: space.sm },
  muted: { fontFamily: fonts.sans, fontSize: 14, color: colors.muted, lineHeight: 20 },
  body: { fontFamily: fonts.sans, fontSize: 16, color: colors.ink, lineHeight: 22 },
  label: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 4 },
  input: { flex: 1, fontFamily: fonts.sans, fontSize: 16, color: colors.ink, paddingHorizontal: 14, paddingVertical: 14, minHeight: 50 },
  suffix: { fontFamily: fonts.sans, color: colors.muted, paddingRight: 14 },
  btn: { backgroundColor: colors.accent, borderRadius: 4, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', minHeight: 54, marginTop: space.sm },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.ink },
  btnDanger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.danger },
  btnText: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.accentInk, letterSpacing: 0.8 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 4, padding: space.md, marginBottom: space.md },
  stepper: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  stepBtn: { width: 44, height: 44, borderWidth: 1, borderColor: colors.line, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  stepTxt: { fontFamily: fonts.sans, fontSize: 22, color: colors.ink },
  stepVal: { fontFamily: fonts.sansMedium, fontSize: 16, color: colors.ink, minWidth: 70, textAlign: 'center' },
});
