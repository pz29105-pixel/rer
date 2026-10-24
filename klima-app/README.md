# Klima-Planer

Handy-App für den Fachbetrieb: Wand beim Kunden fotografieren, ein Klimagerät
darauf platzieren und den Leitungsweg einzeichnen, damit der Kunde sieht, wie es
am Ende aussieht.

## Stand (Prototyp, Schritt 1)

- Foto aufnehmen oder aus der Galerie wählen
- Wandgerät mit einem Finger verschieben, mit zwei Fingern skalieren
- Leitungsweg per Tippen einzeichnen, mit Rückgängig; die Länge wird grob über
  die Gerätebreite (0,8 m) geschätzt

## Auf dem Handy testen

1. App „Expo Go“ aus dem App Store bzw. Google Play installieren.
2. Am Rechner im Ordner `klima-app/`: `npm install`, dann `npx expo start`.
3. Den angezeigten QR-Code mit dem Handy scannen.

## Prüfen

```bash
npx tsc --noEmit
```
