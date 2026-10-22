import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { Body, Button, confirm, ErrorBox, Field, H1, H2, Loading, Screen, num, showError } from '../components/ui';
import { deleteAccount, loadSettings, saveSettings } from '../lib/repo';
import { useAsync } from '../lib/hooks';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Settings } from '../types';

const txt = (n: number) => String(n).replace('.', ',');

export default function SettingsScreen() {
  const { session } = useAuth();
  const { data, error, reload } = useAsync(loadSettings, []);
  const [f, setF] = useState<Record<keyof Settings, string> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setF(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, typeof v === 'number' ? txt(v) : String(v)])) as Record<keyof Settings, string>);
  }, [data]);

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!f) return <Loading />;
  const set = (k: keyof Settings) => (t: string) => setF(o => (o ? { ...o, [k]: t } : o));

  async function save() {
    if (!f) return;
    setBusy(true);
    try {
      await saveSettings({
        company: f.company.trim(),
        hourlyRate: num(f.hourlyRate),
        hoursPerMeter: num(f.hoursPerMeter),
        hoursPerCoreDrill: num(f.hoursPerCoreDrill),
        hoursPerFloor: num(f.hoursPerFloor),
        materialMarkupPercent: num(f.materialMarkupPercent),
        linePricePerMeter: num(f.linePricePerMeter),
        vatPercent: num(f.vatPercent),
        workdayHours: Math.max(1, num(f.workdayHours)),
      });
      reload();
    } catch (e) { showError(e); } finally { setBusy(false); }
  }

  return (
    <Screen>
      <H1>Einstellungen</H1>
      
      <H2>Firma</H2>
      <Field label="Firmenname (erscheint im PDF)" value={f.company} onChangeText={set('company')} />
      <H2>Preise</H2>
      <Field label="Stundensatz" value={f.hourlyRate} onChangeText={set('hourlyRate')} keyboardType="decimal-pad" suffix="€ / Std." />
      <Field label="Leitungsmaterial" value={f.linePricePerMeter} onChangeText={set('linePricePerMeter')} keyboardType="decimal-pad" suffix="€ / m" />
      <Field label="Aufschlag auf Gerätepreis" value={f.materialMarkupPercent} onChangeText={set('materialMarkupPercent')} keyboardType="decimal-pad" suffix="%" />
      <Field label="Mehrwertsteuer" value={f.vatPercent} onChangeText={set('vatPercent')} keyboardType="decimal-pad" suffix="%" />
      <H2>Zeitzuschläge</H2>
      <Field label="Je Meter Leitung" value={f.hoursPerMeter} onChangeText={set('hoursPerMeter')} keyboardType="decimal-pad" suffix="Std." />
      <Field label="Je Kernbohrung" value={f.hoursPerCoreDrill} onChangeText={set('hoursPerCoreDrill')} keyboardType="decimal-pad" suffix="Std." />
      <Field label="Je Etage über EG" value={f.hoursPerFloor} onChangeText={set('hoursPerFloor')} keyboardType="decimal-pad" suffix="Std." />
      <Field label="Arbeitstag" value={f.workdayHours} onChangeText={set('workdayHours')} keyboardType="decimal-pad" suffix="Std." />
      <Button title="Speichern" onPress={save} busy={busy} />

      <H2>Konto</H2>
      <Body>{session?.user.email}</Body>
      <Button kind="ghost" title="Abmelden" onPress={() => supabase.auth.signOut()} />
      <Button kind="ghost" title="Datenschutzerklärung" onPress={() => {
        const url = process.env.EXPO_PUBLIC_PRIVACY_URL;
        if (url) void Linking.openURL(url);
      }} />
      <Button kind="danger" title="Konto und alle Daten löschen" onPress={() =>
        confirm('Konto löschen?', 'Alle Projekte, Fotos und Geräte werden endgültig gelöscht.', 'Endgültig löschen',
          async () => { try { await deleteAccount(); } catch (e) { showError(e); } })} />
    </Screen>
  );
}
