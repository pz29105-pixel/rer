import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import {
  Body, Button, Card, ErrorBox, Field, H1, H2, Loading, Muted, Screen, Stepper, showError,
} from '../components/ui';
import { getProject, listDevices, loadSettings, updateProject } from '../lib/repo';
import { useAsync } from '../lib/hooks';
import { createAndSharePdf } from '../lib/pdf';
import {
  calcPlan, formatDate, formatEuro, formatHours, workdaySchedule,
} from '../logic/planning';
import { colors, fonts } from '../theme';
import type { Placement } from '../types';

/** "TT.MM.JJJJ" -> "JJJJ-MM-TT", sonst null */
function parseDate(t: string): string | null {
  const m = t.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const d = new Date(iso + 'T12:00:00Z');
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? null : iso;
}

export default function PlanScreen() {
  const { id } = useRoute<any>().params as { id: string };
  const { data, error, loading, reload } = useAsync(
    async () => ({
      project: await getProject(id), devices: await listDevices(), settings: await loadSettings(),
    }), [id]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [team, setTeam] = useState(2);
  const [dateText, setDateText] = useState('');
  const [busy, setBusy] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (!data) return;
    setPlacements(data.project.placements);
    setTeam(data.project.teamSize);
    setDateText(data.project.startDate ? formatDate(data.project.startDate) : '');
    loaded.current = true;
  }, [data]);

  const startDate = parseDate(dateText);

  // Änderungen automatisch speichern (leicht verzögert)
  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => {
      updateProject(id, { placements, teamSize: team, startDate }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [id, placements, team, startDate]);

  const plan = useMemo(
    () => (data ? calcPlan(placements, data.devices, data.settings, team) : null),
    [data, placements, team],
  );
  const schedule = useMemo(
    () => (startDate && plan ? workdaySchedule(startDate, plan.workdays) : []),
    [startDate, plan],
  );

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data || !plan) return <Loading />;

  const patch = (key: string, p: Partial<Placement>) =>
    setPlacements(l => l.map(x => (x.key === key ? { ...x, ...p } : x)));

  async function exportPdf() {
    if (!data) return;
    setBusy(true);
    try {
      await updateProject(id, { placements, teamSize: team, startDate });
      await createAndSharePdf({
        customerName: data.project.customerName,
        address: data.project.address,
        notes: data.project.notes,
        photoPath: data.project.photoPath,
        placements, devices: data.devices, plan: plan!, settings: data.settings,
        teamSize: team, schedule, today: new Date().toISOString().slice(0, 10),
      });
    } catch (e) { showError(e); } finally { setBusy(false); }
  }

  return (
    <Screen>
      <H1>Zeit und Kosten</H1>
      <Muted>{data.project.customerName}</Muted>

      <H2>Geräte</H2>
      {placements.map(p => {
        const d = data.devices.find(x => x.id === p.deviceId);
        const line = plan.lines.find(l => l.key === p.key);
        if (!d) return null;
        return (
          <Card key={p.key}>
            <Text style={s.name}>{d.name}</Text>
            <Stepper label="Leitungslänge" value={p.lineMeters} unit="m" max={60}
              onChange={n => patch(p.key, { lineMeters: n })} />
            <Stepper label="Kernbohrungen" value={p.coreDrills} max={10}
              onChange={n => patch(p.key, { coreDrills: n })} />
            <Stepper label="Etage über EG" value={p.floor} max={20}
              onChange={n => patch(p.key, { floor: n })} />
            {line ? <Muted>{formatHours(line.hours)} · Material {formatEuro(line.material)}</Muted> : null}
          </Card>
        );
      })}

      <H2>Team und Termin</H2>
      <Stepper label="Monteure" value={team} min={1} max={10} onChange={setTeam} />
      <Field label="Startdatum (TT.MM.JJJJ)" value={dateText} onChangeText={setDateText}
        keyboardType="numbers-and-punctuation" placeholder="z. B. 26.10.2026" />
      {dateText && !startDate ? <Muted>Bitte das Datum im Format TT.MM.JJJJ eingeben.</Muted> : null}

      <H2>Ergebnis</H2>
      <Card>
        <Row k="Arbeitsaufwand" v={formatHours(plan.personHours)} />
        <Row k={`Dauer mit ${team} ${team === 1 ? 'Monteur' : 'Monteuren'}`} v={formatHours(plan.durationHours)} />
        <Row k="Arbeitstage" v={String(plan.workdays)} />
        {schedule.length ? <Muted>{schedule.map(formatDate).join(', ')}</Muted> : null}
      </Card>
      <Card>
        <Row k="Arbeit" v={formatEuro(plan.labor)} />
        <Row k="Material" v={formatEuro(plan.material)} />
        <Row k="Netto" v={formatEuro(plan.net)} />
        <Row k={`MwSt. ${data.settings.vatPercent} %`} v={formatEuro(plan.vat)} />
        <Row k="Gesamt brutto" v={formatEuro(plan.gross)} strong />
      </Card>
      <Body style={{ color: colors.muted }}>
        Die Preise und Zeiten stammen aus deinem Gerätekatalog und den Einstellungen.
      </Body>
      <Button title="PDF erstellen und teilen" onPress={exportPdf} busy={busy} style={{ marginTop: 16 }} />
    </Screen>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={[s.rk, strong && s.strong]}>{k}</Text>
      <Text style={[s.rv, strong && s.strong]}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  name: { fontFamily: fonts.serifBold, fontSize: 22, color: colors.ink, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rk: { fontFamily: fonts.sans, fontSize: 15, color: colors.ink, flex: 1 },
  rv: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  strong: { fontFamily: fonts.sansMedium, fontSize: 17 },
});
