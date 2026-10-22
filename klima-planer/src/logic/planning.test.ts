import test from 'node:test';
import assert from 'node:assert/strict';
import { calcPlan, workdaySchedule, effectiveTeam } from './planning.ts';
import { DEFAULT_SETTINGS, type Device, type Placement } from '../types.ts';

const device: Device = {
  id: 'd1', name: 'Wandgerät', type: 'innen_wand', imagePath: '', aspect: 0.3,
  installHours: 4, materialPrice: 100,
};
const place = (over: Partial<Placement> = {}): Placement => ({
  key: 'p1', deviceId: 'd1', x: 0.5, y: 0.5, width: 0.3, rotation: 0,
  lineMeters: 0, coreDrills: 0, floor: 0, ...over,
});

test('Grundzeit ohne Zuschläge', () => {
  const p = calcPlan([place()], [device], DEFAULT_SETTINGS, 1);
  assert.equal(p.personHours, 4);
  assert.equal(p.workdays, 1);
});

test('Zuschläge für Leitung, Kernbohrung und Etage', () => {
  const p = calcPlan([place({ lineMeters: 8, coreDrills: 2, floor: 2 })], [device], DEFAULT_SETTINGS, 1);
  // 4 + 8*0.25 + 2*0.75 + 2*0.5 = 8.5
  assert.equal(p.personHours, 8.5);
  assert.equal(p.workdays, 2);
});

test('mehr Monteure verkürzen die Dauer, aber nicht linear', () => {
  const one = calcPlan([place({ lineMeters: 20 })], [device], DEFAULT_SETTINGS, 1);
  const two = calcPlan([place({ lineMeters: 20 })], [device], DEFAULT_SETTINGS, 2);
  assert.ok(two.durationHours < one.durationHours);
  assert.ok(two.durationHours > one.durationHours / 2);
  assert.equal(two.personHours, one.personHours);
  assert.equal(effectiveTeam(0), 1);
});

test('Kosten: Arbeit + Material + MwSt', () => {
  const s = { ...DEFAULT_SETTINGS, hourlyRate: 50, materialMarkupPercent: 10, linePricePerMeter: 10, vatPercent: 19 };
  const p = calcPlan([place({ lineMeters: 4 })], [device], s, 1);
  // Stunden 4 + 1 = 5 -> 250; Material 100*1.1 + 40 = 150
  assert.equal(p.labor, 250);
  assert.equal(p.material, 150);
  assert.equal(p.net, 400);
  assert.equal(p.vat, 76);
  assert.equal(p.gross, 476);
});

test('unbekannte Geräte und leere Planung', () => {
  const p = calcPlan([place({ deviceId: 'x' })], [device], DEFAULT_SETTINGS, 2);
  assert.equal(p.lines.length, 0);
  assert.equal(p.workdays, 0);
  assert.equal(p.gross, 0);
});

test('Terminvorschlag überspringt das Wochenende', () => {
  // 2026-10-23 ist ein Freitag
  assert.deepEqual(workdaySchedule('2026-10-23', 3), ['2026-10-23', '2026-10-26', '2026-10-27']);
  assert.deepEqual(workdaySchedule('2026-10-24', 1), ['2026-10-26']);
  assert.deepEqual(workdaySchedule('kaputt', 2), []);
});
