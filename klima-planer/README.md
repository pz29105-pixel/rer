# Klima-Planer

Handy-App (Android und iOS) für Klimaanlagen-Monteure: Foto der Wand, Gerät einfügen, Zeit und Kosten berechnen, PDF für den Kunden.

- Technik: Expo / React Native, TypeScript, Supabase (Login, Datenbank, Bilder)
- Einrichtung und Veröffentlichung: [docs/ANLEITUNG.md](docs/ANLEITUNG.md)
- Prüfen: `npm test` (Rechenlogik, PDF), `npm run typecheck`, `npm run check` (Zugangsdaten)
- Test auf dem Handy: [docs/TESTEN.md](docs/TESTEN.md)
- Rechenlogik: `src/logic/` (ohne Abhängigkeiten, deshalb mit Node testbar)
