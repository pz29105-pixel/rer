# rer

Claude Code Mods.

## Mods

**selbst-check**: Prüft jede Datei, die Claude ändert, sofort auf Fehler und Sicherheitslücken. Python wird mit `py_compile` und `ruff` geprüft, JavaScript mit `node --check`, Shell mit `bash -n` und `shellcheck`, JSON wird geparst. Dazu kommt eine Mustersuche nach Sicherheitslücken. Funde gehen direkt an Claude zurück, damit Claude sie behebt. Mit `/selbstcheck` prüfst du alle geänderten Dateien.

**design-eigenstil**: Gibt Claude Design-Regeln gegen den 08/15-Look mit. Jede UI-Datei wird auf Vorlagen-Muster geprüft, zum Beispiel Standard-Schriften, Lila-Blau-Verläufe, Emoji-Icons und Floskeln. Mit `/designstil <Richtung>` legst du eine feste Stilrichtung fest, mit `/designcheck` prüfst du alle geänderten UI-Dateien.

**lern-gedaechtnis**: Wenn du Claude korrigierst oder eine Vorliebe nennst, speichert Claude das als Regel. Die Regeln gelten danach in jeder Sitzung. Mit `/regeln` siehst du alle Regeln, mit `/regel <Text>` fügst du eine hinzu, mit `/regel-loeschen <Nr | alle>` löschst du sie.

**test-waechter**: Hat Claude Code geändert, laufen vor dem „fertig“ die Projekttests. Sind sie rot, muss Claude weiterarbeiten, höchstens 3 Korrekturversuche lang. Erkannt werden npm, pnpm, yarn, bun, pytest, cargo, go und make. Mit `/tests` startest du die Tests sofort, mit `/testbefehl <Befehl>` legst du einen eigenen Befehl fest.

**spar-pilot**: Erkennt, ob eine Aufgabe leicht, normal oder schwer ist, und stellt den Denkaufwand (effort) passend ein. Ein Wechsel macht den Prompt-Cache ungültig, deshalb wird bei großem Gesprächsverlauf nur hochgeschaltet, wenn die Aufgabe es braucht, und nicht für kleine Ersparnisse heruntergeschaltet. Bestätigungen wie „Ja“ setzen die laufende Einstellung fort. Die Statuszeile zeigt Denkaufwand, Kontextgröße, Cache-Quote und Kosten. Mit `/sparmodus sparsam | ausgewogen | qualitaet | aus` wählst du den Modus, mit `/verbrauch` siehst du die Bilanz der Sitzung.

## Installation

In einer Claude-Code-Sitzung im Terminal eingeben:

```
/plugin install selbst-check --marketplace pz29105-pixel/rer
/plugin install design-eigenstil --marketplace pz29105-pixel/rer
/plugin install lern-gedaechtnis --marketplace pz29105-pixel/rer
/plugin install test-waechter --marketplace pz29105-pixel/rer
/plugin install spar-pilot --marketplace pz29105-pixel/rer
```

Die Frage nach dem Marketplace mit `y` bestätigen, dann den Scope wählen.
