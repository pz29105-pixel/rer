// Reine Rechenfunktionen für den Editor, ohne React-Native-Abhängigkeiten.

export type Punkt = { x: number; y: number };

export const MIN_SKALA = 0.3;
export const MAX_SKALA = 4;

export function abstand(a: Punkt, b: Punkt): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function begrenze(wert: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, wert));
}

// Neue Skala aus dem Fingerabstand beim Start und jetzt.
export function pinchSkala(startSkala: number, startAbstand: number, jetztAbstand: number): number {
  if (startAbstand <= 0) return startSkala;
  return begrenze(startSkala * (jetztAbstand / startAbstand), MIN_SKALA, MAX_SKALA);
}

// SVG-Pfad für den Leitungsweg durch alle Punkte.
export function leitungsPfad(punkte: Punkt[]): string {
  return punkte.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}

// Gesamtlänge des Leitungswegs in Bildschirmpunkten.
export function pfadLaenge(punkte: Punkt[]): number {
  let summe = 0;
  for (let i = 1; i < punkte.length; i++) summe += abstand(punkte[i - 1], punkte[i]);
  return summe;
}
