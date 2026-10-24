# KlimaPlaner

Mobile App (iPhone und Android, React Native mit Expo und TypeScript) für die Beratung bei Klimaanlagen: Kunde und Räume erfassen, Kühlleistung schätzen, Gerät wählen, Gerät und Leitungsweg auf Fotos zeigen, Kosten schätzen und ein Angebot als PDF erstellen. Alles ist deutsch, lokal auf dem Gerät gespeichert und funktioniert offline (kein Login, keine Cloud).

## Anpassen (Name, Firma, Farben, Logo)

| Was | Wo |
| --- | --- |
| App-Name, Hauptfarbe, Akzentfarbe, Firmendaten (Vorbelegung), Beispielgeräte | `src/data/defaults.ts` |
| App-Name im Store, Bundle-ID, Version | `app.json` (`name`, `ios.bundleIdentifier`, `android.package`) |
| App-Icon und Startbild | `assets/icon.png`, `assets/splash-icon.png`, `assets/android-icon-*.png` |
| Logo im Angebot | in der App: Einstellungen → Firmendaten und Logo |
| Produktbilder | in der App: Einstellungen → Gerätekatalog → Gerät → Produktbild (PNG mit transparentem Hintergrund) |
| Preise, MwSt., Angebotstexte | in der App: Einstellungen |

Die Bundle-ID `de.example.klimaplaner` muss vor dem ersten Store-Build durch eine eigene ersetzt werden (z. B. `de.deinefirma.klimaplaner`).

## Auf dem Handy testen (Expo Go)

1. Node.js (Version 20 oder neuer) installieren.
2. Im Ordner `klima-app`: `npm install`
3. `npx expo start`
4. Auf dem Handy die App **Expo Go** installieren (App Store bzw. Google Play), Handy und Rechner im selben WLAN.
5. iPhone: mit der Kamera-App den QR-Code scannen. Android: in Expo Go „Scan QR code“.

Hinweis: Expo Go unterstützt nur die SDK-Version, die zur installierten Expo-Go-Version passt. Falls die App meldet, dass die SDK-Version nicht passt, aktualisiere Expo Go oder nutze einen Development Build (`npx expo run:android` / `npx expo run:ios`).

## Qualität prüfen

- `npm run typecheck` – TypeScript-Prüfung
- `npm test` – Tests der Berechnungen (Kühlleistung, Kosten)

## App Store und Google Play

Die Builds laufen über EAS (Expo Application Services).

1. Konten: Apple Developer Program (99 $/Jahr) und Google Play Console (einmalig 25 $), dazu ein kostenloses Expo-Konto.
2. `npm install -g eas-cli`, dann `eas login`
3. `eas build:configure` (verknüpft das Projekt und trägt die `projectId` in `app.json` ein)
4. Bundle-ID und Paketname in `app.json` setzen (siehe oben), Icon und Splash ersetzen.
5. Build erstellen:
   - Android: `eas build --platform android --profile production` (liefert eine `.aab`-Datei)
   - iOS: `eas build --platform ios --profile production` (EAS fragt nach den Apple-Zugangsdaten und erzeugt Zertifikate selbst)
   - Zum Testen ohne Store: `eas build --platform android --profile preview` (liefert eine installierbare `.apk`)
6. Einreichen:
   - `eas submit --platform ios` bzw. `eas submit --platform android`, oder die Datei manuell in App Store Connect bzw. die Play Console hochladen.
7. In den Store-Einträgen brauchst du: App-Beschreibung (deutsch), Screenshots, Datenschutzerklärung (die App speichert alles nur lokal, sendet nichts und nutzt Kamera und Fotos) und die Altersangabe.

Die Berechtigungstexte für Kamera und Fotos stehen in `app.json` (Plugin `expo-image-picker`) und `locales/de.json`.

## Aufbau

```
App.tsx                      Einstieg, lädt die gespeicherten Daten
src/navigation.tsx           alle Bildschirme und ihre Parameter
src/types.ts                 Datentypen (Kunde, Projekt, Raum, Gerät …)
src/store/AppStore.tsx       Speicher: React-Context + AsyncStorage (lokal)
src/logic/kuehllast.ts       Faustformel für die Kühlleistung (Werte oben in der Datei)
src/logic/kosten.ts          Kostenaufstellung: netto, MwSt., brutto
src/pdf/angebot.ts           Angebot als HTML → PDF (expo-print), Teilen (expo-sharing)
src/components/FotoSzene.tsx Foto + Gerät + Leitung; wird für das PDF zu einem Bild gespeichert
src/screens/                 ein Bildschirm je Schritt (Kunde → Räume → Leistung → Gerät → Foto → Leitung → Kosten → Angebot)
scripts/platzhalter.py       erzeugt die Platzhalter-Produktbilder in assets/geraete/
```

Die Gesten (Verschieben, Zoomen, Drehen) sind mit dem eingebauten `PanResponder` umgesetzt, damit keine zusätzlichen nativen Module nötig sind und alles in Expo Go läuft.

## Wichtig zur Kühlleistung

Die berechnete Leistung ist eine Schätzung per Faustformel (Raumvolumen, Dämmung, Fenster nach Himmelsrichtung, Personen, Nutzung, Dachgeschoss). Sie ersetzt keine normgerechte Heiz- bzw. Kühllastberechnung; der Hinweis steht in der App und im PDF.
