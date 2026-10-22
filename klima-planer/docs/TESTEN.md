# Test auf dem Handy: Checkliste

Vorher: Supabase einrichten und `.env` ausfüllen (siehe ANLEITUNG.md), dann `npm run check`.

Start: `npm install`, dann `npx expo start`. Handy und Rechner im selben WLAN, Expo Go öffnen, QR-Code scannen. Falls das WLAN Geräte trennt: `npx expo start --tunnel`.

Für einen Test brauchst du 1–2 Gerätebilder (PNG mit transparentem Hintergrund) und ein Foto einer Wand.

## Ablauf
1. [ ] **Registrieren** und anmelden (bei aktiver E-Mail-Bestätigung zuerst den Link bestätigen).
2. [ ] **Einstellungen:** Firmenname und Stundensatz speichern, Bildschirm schließen, wieder öffnen: Werte noch da?
3. [ ] **Geräte:** Gerät mit Bild, Typ, Zeit und Preis anlegen. Erscheint die Vorschau in der Liste?
4. [ ] **Projekt anlegen:** Kunde und Adresse eintragen, speichern.
5. [ ] **Foto:** einmal „Aufnehmen“, einmal „Auswählen“. Erscheint das Foto?
6. [ ] **Editor:** Gerät hinzufügen.
   - [ ] Mit einem Finger verschieben
   - [ ] Mit zwei Fingern vergrößern und drehen
   - [ ] Plus/Minus bei Größe und Drehung
   - [ ] Gerät entfernen
   - [ ] „Fertig“, Projekt wieder öffnen: Platzierung gespeichert?
7. [ ] **Planung:** Leitung, Kernbohrung, Etage, Monteure ändern. Ändern sich Stunden, Tage und Preise sofort? Stimmt die Summe mit einer Handrechnung?
8. [ ] **Startdatum** `TT.MM.JJJJ`: Werden Wochenenden übersprungen?
9. [ ] **PDF:** erstellen und teilen. Sind Foto, Gerät an der richtigen Stelle, Zeitplan und Kosten drin?
10. [ ] **Abmelden und anmelden**, die Daten sind noch da.
11. [ ] **Zweites Konto:** sieht es keine Daten des ersten? (Zugriffsschutz)
12. [ ] **Konto löschen** (nur mit einem Testkonto).

## Worauf ich besonders achte
- Gesten im Editor (Drehen und Zoomen)
- PDF: Gerät sitzt exakt wie im Editor
- Kamera- und Fotoberechtigungen auf iOS und Android
- Lesbarkeit bei Sonnenlicht

Schick mir bei Fehlern eine kurze Beschreibung oder einen Screenshot, plus wenn möglich die rote Fehlermeldung aus Expo Go.
