# rer – Claude-Code-Mods

Dieses Repo ist ein Claude-Code-Marketplace. Jeder Mod ist ein Plugin aus Funktions-Hooks (TypeScript, kein Node, kein DOM: alles läuft über `$`).

## Aufbau

- `.claude-plugin/marketplace.json` – listet jeden Mod mit `source: ./mods/<name>`
- `mods/<name>/.claude-plugin/plugin.json` – Name, Version, Beschreibung
- `mods/<name>/hooks/hooks.json` – `{ "modules": ["./register.ts"] }`
- `mods/<name>/hooks/register.ts` – `export const register: Register = on => { ... }`
- Reine Logik in eine eigene Datei (`logic.ts`, `rules.ts`, …), damit sie ohne Engine testbar ist
- `mods/<name>/hooks/*.test.ts` – Tests mit `claude-code/testing`

Neuen Mod anlegen: Skill `/neuer-mod`.

## Prüfen

- `make test` – validiert den Marketplace und führt die Tests aller Mods aus. Muss vor jedem Commit grün sein.
- Einzelner Mod: `claude plugin test mods/<name>`
- Die API-Typen stehen in der Datei, die der Skill `plugin-authoring` beim Laden nennt (`types/claude-code.d.ts`). Bei Unsicherheit dort nachschlagen, nicht raten.

## Regeln für Mods

- Hooks, die etwas blockieren können (`tool.call`, `classic.Stop`, `prompt.compose`, …), bekommen ein `.catch`, das den Ablauf durchlässt: `.catch(($, e, next) => next(e))`.
- `$` nie an Funktionen aus einer anderen Datei übergeben – das Modul lädt sonst nicht. Funktionen mit `$` gehören in `register.ts`.
- Kein `import()` – ein Modul damit lädt nicht. Plugin-Dateien mit `import` und Endung `.ts` einbinden.
- Werkzeuge, die evtl. fehlen (`ruff`, `shellcheck`, …), über `$.process.run` in `try/catch` aufrufen; fehlend heißt überspringen, nicht scheitern.
- Hooks am Ende einer Antwort (`classic.Stop`) brauchen eine Obergrenze für Wiederholungen.
- `prompt.compose`-Abschnitte mit wechselndem Inhalt sind `scope: 'session'`; sie kosten bei jeder Anfrage Tokens, also kurz halten.
- Denkaufwand oder Modell mitten im Gespräch zu wechseln, macht den Prompt-Cache ungültig.
- Texte für den Nutzer sind auf Deutsch.

## Änderungen

- Neuer Mod: Eintrag in `marketplace.json` und Abschnitt plus Installationszeile in `README.md`.
- Geänderter Mod: `version` in seiner `plugin.json` erhöhen, sonst bekommen installierte Kopien das Update nicht.
- Von Claude Code erzeugte Dateien (`mods/*/.claude-plugin/types/`, `mods/*/tsconfig.json`) nicht committen.
