---
name: neuer-mod
description: Legt in diesem Repo einen neuen Claude-Code-Mod an (Ordner, Manifest, Hooks-Modul, Test, Marketplace-Eintrag, README) und prüft ihn. Verwenden, wenn der Nutzer einen neuen Mod für das rer-Marketplace bauen will.
argument-hint: <name> [was der Mod tun soll]
---

# Neuen Mod anlegen

Argument: `$ARGUMENTS` – erstes Wort ist der Mod-Name (klein, mit Bindestrichen), der Rest beschreibt, was er tun soll. Fehlt die Beschreibung, frag kurz nach.

## 1. API laden

Lade den Skill `plugin-authoring`, bevor du Code schreibst. Er nennt die Typdatei dieses Builds; schlag Events und `$`-Methoden dort nach, statt zu raten.

## 2. Dateien anlegen

`mods/<name>/.claude-plugin/plugin.json`:

```json
{ "name": "<name>", "version": "0.1.0", "description": "<ein Satz auf Deutsch>" }
```

`mods/<name>/hooks/hooks.json`:

```json
{ "modules": ["./register.ts"] }
```

`mods/<name>/hooks/register.ts` – Grundgerüst:

```ts
import type { Register } from 'claude-code'
import { /* reine Logik */ } from './logic.ts'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // Befehle registrieren: await $.command.register({ name, description })
    return next(e)
  })
}
```

`mods/<name>/hooks/logic.ts` – alles, was sich ohne Engine testen lässt (Erkennen, Entscheiden, Formatieren).

`mods/<name>/hooks/<name>.test.ts`:

```ts
import { expect, test } from 'claude-code/testing'
```

Mindestens: ein Test für die reine Logik und einer, der den Hook über `$` auslöst (`$.tool.call`, `$.prompt.compose`, …). Braucht der Mod `$.store`, im Test `mock.store(on)` aufrufen.

Halte dich an die Regeln in `CLAUDE.md` (`.catch` an blockierenden Hooks, kein `import()`, Obergrenzen, deutsche Texte).

## 3. Eintragen

- `.claude-plugin/marketplace.json`: `{ "name": "<name>", "source": "./mods/<name>", "description": "…" }` an `plugins` anhängen.
- `README.md`: einen Abschnitt `**<name>**: …` vor `## Installation` und die Zeile `/plugin install <name> --marketplace pz29105-pixel/rer` in den Installationsblock.

## 4. Prüfen

1. `claude plugin validate mods/<name>` – liest Manifest und Modul wie die Engine.
2. Typprüfung: tsconfig aus dem Kopf der Typdatei (siehe `plugin-authoring`) außerhalb des Repos anlegen, `include` = Typdatei + `mods/<name>/hooks`, dann `tsc -p <datei>`.
3. `make test` – muss komplett grün sein.

Erst dann committen. Dem Nutzer sagen, was der Mod tut, was die Tests abdecken und was nur im echten Betrieb sichtbar wird.
