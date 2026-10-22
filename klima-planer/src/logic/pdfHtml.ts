import type { Device, Placement, Settings } from '../types.ts';
import { formatDate, formatEuro, formatHours, type Plan } from './planning.ts';

export type PdfInput = {
  customerName: string;
  address: string;
  notes: string;
  /** Foto als data:-URI, oder null */
  photo: string | null;
  /** Gerätebilder (data:-URI) nach Geräte-ID */
  deviceImages: Record<string, string>;
  placements: Placement[];
  devices: Device[];
  plan: Plan;
  settings: Settings;
  teamSize: number;
  schedule: string[];
  today: string;
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const num = (n: number) => String(Math.round(n * 1000) / 1000);

export function buildPdfHtml(i: PdfInput): string {
  const sprites = i.placements
    .map(p => {
      const d = i.devices.find(x => x.id === p.deviceId);
      const src = i.deviceImages[p.deviceId];
      if (!d || !src) return '';
      return `<img class="dev" src="${src}" style="left:${num(p.x * 100)}%;top:${num(p.y * 100)}%;width:${num(p.width * 100)}%;transform:translate(-50%,-50%) rotate(${num(p.rotation)}deg)">`;
    })
    .join('');

  const rows = i.plan.lines
    .map(
      l => `<tr><td>${esc(l.name)}</td><td class="r">${formatHours(l.hours)}</td><td class="r">${formatEuro(l.material)}</td></tr>`,
    )
    .join('');

  const days = i.schedule.length
    ? `<p class="small">Voraussichtliche Montagetage: ${i.schedule.map(formatDate).join(', ')}</p>`
    : '';

  return `<!doctype html><html lang="de"><head><meta charset="utf-8">
<style>
  @page { margin: 28px; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #2B2A26; font-size: 13px; }
  h1 { font-weight: 500; font-size: 28px; margin: 0 0 4px; }
  h2 { font-weight: 500; font-size: 18px; margin: 22px 0 8px; border-bottom: 1px solid #E2DACB; padding-bottom: 4px; }
  .small { color: #807A6E; font-size: 12px; }
  .photo { position: relative; width: 100%; margin-top: 10px; }
  .photo img.base { width: 100%; display: block; }
  .photo img.dev { position: absolute; }
  table { width: 100%; border-collapse: collapse; }
  td, th { padding: 6px 4px; border-bottom: 1px solid #E2DACB; text-align: left; }
  .r { text-align: right; }
  .total td { font-weight: bold; border-bottom: none; }
</style></head><body>
<div class="small">${esc(i.settings.company)}</div>
<h1>Ihre neue Klimaanlage</h1>
<div class="small">Angebot vom ${esc(formatDate(i.today))}</div>
<h2>Kunde</h2>
<p>${esc(i.customerName)}<br>${esc(i.address).replace(/\n/g, '<br>')}</p>
${i.photo ? `<h2>So wird es aussehen</h2><div class="photo"><img class="base" src="${i.photo}">${sprites}</div>` : ''}
<h2>Geräte und Aufwand</h2>
<table>
  <tr><th>Gerät</th><th class="r">Arbeitszeit</th><th class="r">Material</th></tr>
  ${rows}
</table>
<h2>Zeitplan</h2>
<p>Gesamter Arbeitsaufwand: ${formatHours(i.plan.personHours)}<br>
Team: ${i.teamSize} ${i.teamSize === 1 ? 'Monteur' : 'Monteure'}<br>
Dauer: ca. ${formatHours(i.plan.durationHours)} (${i.plan.workdays} ${i.plan.workdays === 1 ? 'Arbeitstag' : 'Arbeitstage'})</p>
${days}
<h2>Kosten</h2>
<table>
  <tr><td>Arbeit (${formatHours(i.plan.personHours)} × ${formatEuro(i.settings.hourlyRate)})</td><td class="r">${formatEuro(i.plan.labor)}</td></tr>
  <tr><td>Material</td><td class="r">${formatEuro(i.plan.material)}</td></tr>
  <tr><td>Summe netto</td><td class="r">${formatEuro(i.plan.net)}</td></tr>
  <tr><td>MwSt. ${i.settings.vatPercent} %</td><td class="r">${formatEuro(i.plan.vat)}</td></tr>
  <tr class="total"><td>Gesamt brutto</td><td class="r">${formatEuro(i.plan.gross)}</td></tr>
</table>
${i.notes ? `<h2>Hinweise</h2><p>${esc(i.notes).replace(/\n/g, '<br>')}</p>` : ''}
<p class="small" style="margin-top:24px">Unverbindliche Schätzung. Die Visualisierung dient der Veranschaulichung.</p>
</body></html>`;
}
