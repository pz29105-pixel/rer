import type { Device, Placement, Settings } from '../types.ts';

export type PlanLine = {
  key: string;
  name: string;
  baseHours: number;
  lineHours: number;
  coreHours: number;
  floorHours: number;
  hours: number;
  material: number;
};

export type Plan = {
  lines: PlanLine[];
  /** Summe aller Arbeitsstunden (Personenstunden) */
  personHours: number;
  /** Wirksame Teamgröße: weitere Monteure arbeiten nicht ganz so effizient */
  effectiveTeam: number;
  /** Dauer in Stunden bei der gewählten Teamgröße */
  durationHours: number;
  workdays: number;
  labor: number;
  material: number;
  net: number;
  vat: number;
  gross: number;
};

const TEAM_EFFICIENCY = 0.85;

export function effectiveTeam(teamSize: number): number {
  const n = Math.max(1, Math.floor(teamSize));
  return 1 + (n - 1) * TEAM_EFFICIENCY;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calcPlan(
  placements: Placement[],
  devices: Device[],
  settings: Settings,
  teamSize: number,
): Plan {
  const lines: PlanLine[] = [];
  for (const p of placements) {
    const d = devices.find(x => x.id === p.deviceId);
    if (!d) continue;
    const baseHours = d.installHours;
    const lineHours = Math.max(0, p.lineMeters) * settings.hoursPerMeter;
    const coreHours = Math.max(0, p.coreDrills) * settings.hoursPerCoreDrill;
    const floorHours = Math.max(0, p.floor) * settings.hoursPerFloor;
    const material =
      d.materialPrice * (1 + settings.materialMarkupPercent / 100) +
      Math.max(0, p.lineMeters) * settings.linePricePerMeter;
    lines.push({
      key: p.key,
      name: d.name,
      baseHours,
      lineHours,
      coreHours,
      floorHours,
      hours: baseHours + lineHours + coreHours + floorHours,
      material: round2(material),
    });
  }
  const personHours = round2(lines.reduce((s, l) => s + l.hours, 0));
  const team = effectiveTeam(teamSize);
  const durationHours = round2(personHours / team);
  const workdays = durationHours === 0 ? 0 : Math.ceil(durationHours / Math.max(1, settings.workdayHours));
  const labor = round2(personHours * settings.hourlyRate);
  const material = round2(lines.reduce((s, l) => s + l.material, 0));
  const net = round2(labor + material);
  const vat = round2((net * settings.vatPercent) / 100);
  return {
    lines,
    personHours,
    effectiveTeam: team,
    durationHours,
    workdays,
    labor,
    material,
    net,
    vat,
    gross: round2(net + vat),
  };
}

/** Die nächsten `days` Werktage (Mo–Fr) ab `start` (inklusive, falls Werktag), als ISO-Datum. */
export function workdaySchedule(start: string, days: number): string[] {
  const out: string[] = [];
  const d = new Date(start + 'T12:00:00Z');
  if (Number.isNaN(d.getTime())) return out;
  while (out.length < days) {
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export function formatHours(h: number): string {
  const total = Math.round(h * 4) / 4;
  return total.toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' Std.';
}

export function formatEuro(n: number): string {
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}
