import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPdfHtml, type PdfInput } from './pdfHtml.ts';
import { calcPlan } from './planning.ts';
import { DEFAULT_SETTINGS, type Device, type Placement } from '../types.ts';

const device: Device = { id: 'd1', name: 'Gerät <A>', type: 'innen_wand', imagePath: 'x', aspect: 0.3, installHours: 4, materialPrice: 100 };
const placement: Placement = { key: 'k', deviceId: 'd1', x: 0.5, y: 0.25, width: 0.4, rotation: 10, lineMeters: 0, coreDrills: 0, floor: 0 };

function input(over: Partial<PdfInput> = {}): PdfInput {
  return {
    customerName: 'Müller <b>', address: 'Straße 1\n12345 Ort', notes: '', photo: 'data:image/jpeg;base64,AAA',
    deviceImages: { d1: 'data:image/png;base64,BBB' }, placements: [placement], devices: [device],
    plan: calcPlan([placement], [device], DEFAULT_SETTINGS, 2), settings: DEFAULT_SETTINGS, teamSize: 2,
    schedule: ['2026-10-26'], today: '2026-10-22', ...over,
  };
}

test('PDF enthält Foto, Gerät und Termine; Texte werden maskiert', () => {
  const html = buildPdfHtml(input());
  assert.match(html, /class="dev" src="data:image\/png;base64,BBB"/);
  assert.match(html, /left:50%;top:25%;width:40%/);
  assert.match(html, /26\.10\.2026/);
  assert.ok(html.includes('Müller &lt;b&gt;'));
  assert.ok(html.includes('Gerät &lt;A&gt;'));
  assert.ok(!html.includes('Müller <b>'));
});

test('ohne Foto kein Visualisierungsabschnitt', () => {
  assert.ok(!buildPdfHtml(input({ photo: null })).includes('So wird es aussehen'));
});
