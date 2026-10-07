export type ProjectFiles = {
  names: readonly string[]
  packageJson?: string
  makefile?: string
}

// Dateien, deren Änderung keinen Testlauf braucht.
const NOT_CODE = /\.(md|mdx|txt|rst|png|jpe?g|gif|svg|ico|webp|pdf|lock)$|(^|\/)(LICENSE|CHANGELOG)[^/]*$/i

export const isCodeChange = (path: string) => !NOT_CODE.test(path)

// Findet den Testbefehl des Projekts anhand typischer Dateien im Projektordner.
export function detectTestCommand({ names, packageJson, makefile }: ProjectFiles): string[] | undefined {
  const has = (n: string) => names.includes(n)

  if (packageJson !== undefined) {
    try {
      const test = JSON.parse(packageJson)?.scripts?.test
      if (typeof test === 'string' && !/no test specified/i.test(test)) {
        if (has('pnpm-lock.yaml')) return ['pnpm', 'test']
        if (has('yarn.lock')) return ['yarn', 'test']
        if (has('bun.lockb') || has('bun.lock')) return ['bun', 'run', 'test']
        return ['npm', 'test', '--silent']
      }
    } catch {
      // kaputtes package.json: weiter mit den anderen Erkennungen
    }
  }
  if (['pytest.ini', 'pyproject.toml', 'setup.cfg', 'tox.ini', 'conftest.py'].some(has) || has('tests') || names.some(n => /^test_.*\.py$/.test(n))) {
    return ['python3', '-m', 'pytest', '-q', '-x']
  }
  if (has('Cargo.toml')) return ['cargo', 'test', '-q']
  if (has('go.mod')) return ['go', 'test', './...']
  if (makefile !== undefined && /^test\s*:/m.test(makefile)) return ['make', 'test']
  return undefined
}

// Ergebnis eines Testlaufs einordnen. "missing" = Werkzeug oder Tests fehlen, kein Fehler im Code.
export function classify(argv: readonly string[], exitCode: number, output: string): 'passed' | 'failed' | 'missing' {
  if (exitCode === 0) return 'passed'
  if (argv.includes('pytest') && (exitCode === 5 || /No module named pytest/.test(output))) return 'missing'
  if (exitCode === 127 || /command not found/.test(output)) return 'missing'
  return 'failed'
}

export function tail(text: string, lines = 60) {
  return text.trim().split('\n').slice(-lines).join('\n')
}
