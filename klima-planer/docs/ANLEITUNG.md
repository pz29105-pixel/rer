# Klima-Planer: Anleitung

## 1. Supabase einrichten (einmalig, kostenlos zum Start)
1. Auf https://supabase.com ein Konto anlegen und ein neues Projekt erstellen (Region: Frankfurt).
2. Im Projekt links **SQL Editor** öffnen, den kompletten Inhalt von `supabase/schema.sql` einfügen und auf **Run** klicken. Das legt Tabellen, Zugriffsschutz und die zwei privaten Bildspeicher an.
3. Unter **Authentication → Providers** ist „Email“ schon aktiv. Für erste Tests kannst du unter **Authentication → Sign In / Providers → Email** die E-Mail-Bestätigung ausschalten. Für den Store solltest du sie eingeschaltet lassen.
4. Unter **Project Settings → API** die **Project URL** und den **anon public key** kopieren.

## 2. App lokal starten
```bash
cd klima-planer
cp .env.example .env     # URL und Key eintragen
npm install
npx expo start
```
Auf dem Handy die App **Expo Go** installieren und den QR-Code scannen.

## 3. Erste Schritte in der App
1. Registrieren und anmelden.
2. **Einstellungen:** Firmenname, Stundensatz, Zuschläge eintragen.
3. **Geräte:** Gerätebilder hinzufügen (PNG mit transparentem Hintergrund, Name, Typ, Montagezeit, Materialpreis).
4. **Projekte → Neues Projekt:** Kunde eintragen, Foto aufnehmen, „Geräte im Foto platzieren“, dann „Zeit, Kosten und PDF“.

## 4. Berechnung
- Arbeitszeit je Gerät = Montagezeit + Meter × Zuschlag + Kernbohrungen × Zuschlag + Etagen × Zuschlag.
- Mehrere Monteure verkürzen die Dauer, aber nicht linear: Jeder weitere Monteur zählt als 0,85 Monteur.
- Arbeitstage = aufgerundet (Dauer / Stunden pro Arbeitstag). Der Terminvorschlag überspringt Wochenenden (Feiertage nicht).
- Material = Gerätepreis plus Aufschlag plus Leitungsmeter × Preis je Meter. Danach MwSt.

## 5. Veröffentlichung in den Stores
1. Konten: Apple Developer Program (99 $/Jahr) und Google Play Console (25 $ einmalig).
2. In `app.json` die `bundleIdentifier` (iOS) und `package` (Android) von `de.example.klimaplaner` auf deine eigene ändern, zum Beispiel `de.deinefirma.klimaplaner`.
3. App-Icon und Splash-Bild in `assets/` durch eigene ersetzen.
4. Datenschutzerklärung und Impressum auf einer öffentlichen Webseite veröffentlichen (Vorlage: `docs/DATENSCHUTZ-VORLAGE.md`) und die Adresse in `.env` als `EXPO_PUBLIC_PRIVACY_URL` eintragen.
5. Bauen und einreichen mit EAS:
   ```bash
   npm install -g eas-cli
   eas login
   eas build:configure
   eas build --platform all
   eas submit --platform all
   ```
6. Beide Stores verlangen: Datenschutz-URL, Screenshots, Angabe zur Datenerhebung. Die Kontolöschung ist in der App (Einstellungen) vorhanden. Das verlangen beide Stores.

## 6. Bekannte Grenzen von Version 0.1
- Die Visualisierung ist ein Foto mit eingefügtem Gerätebild (keine 3D-/AR-Ansicht).
- Feiertage werden im Terminvorschlag nicht berücksichtigt.
- Bilder eines Geräts lassen sich nicht nachträglich austauschen.
- Die App wurde ohne echtes Handy gebaut und geprüft (Typprüfung, Rechenlogik-Tests, Bundle für Android und iOS). Der Test auf dem Gerät steht noch aus.
