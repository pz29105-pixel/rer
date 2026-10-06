# rer

Claude Code Mods.

## Mods

**selbst-check**: Prüft jede Datei, die Claude ändert, sofort auf Fehler und Sicherheitslücken. Python wird mit `py_compile` und `ruff` geprüft, JavaScript mit `node --check`, Shell mit `bash -n` und `shellcheck`, JSON wird geparst. Dazu kommt eine Mustersuche nach Sicherheitslücken. Funde gehen direkt an Claude zurück, damit Claude sie behebt. Mit `/selbstcheck` prüfst du alle geänderten Dateien.

**design-eigenstil**: Gibt Claude Design-Regeln gegen den 08/15-Look mit. Jede UI-Datei wird auf Vorlagen-Muster geprüft, zum Beispiel Standard-Schriften, Lila-Blau-Verläufe, Emoji-Icons und Floskeln. Mit `/designstil <Richtung>` legst du eine feste Stilrichtung fest, mit `/designcheck` prüfst du alle geänderten UI-Dateien.

## Installation

In einer Claude-Code-Sitzung im Terminal eingeben:

```
/plugin install selbst-check --marketplace pz29105-pixel/rer
/plugin install design-eigenstil --marketplace pz29105-pixel/rer
```

Die Frage nach dem Marketplace mit `y` bestätigen, dann den Scope wählen.
