# Prüft die Marketplace-Datei und testet jeden Mod.
SHELL := /bin/bash
.PHONY: test
test:
	@set -o pipefail; claude plugin validate . | tail -1
	@set -eo pipefail; for m in mods/*/; do echo "== $$m"; claude plugin test "$$m" | grep -E "^ *[0-9]+ (pass|fail)|^\(fail\)|Error"; done
