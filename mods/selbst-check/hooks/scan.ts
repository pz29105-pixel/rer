// Sprachübergreifende Muster für typische Sicherheitslücken. Bewusst einfach:
// lieber ein Hinweis zu viel, den Claude kurz begründet, als eine echte Lücke übersehen.

export type Finding = { line: number; rule: string; message: string }

type Rule = { id: string; pattern: RegExp; message: string; ext?: RegExp }

const CODE = /\.(py|js|mjs|cjs|jsx|ts|tsx|php|rb|go|java|kt|cs|sh|bash)$/i
const PY = /\.py$/i
const JS = /\.(js|mjs|cjs|jsx|ts|tsx)$/i

const RULES: Rule[] = [
  { id: 'secret-private-key', pattern: /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/, message: 'Privater Schlüssel im Code' },
  { id: 'secret-aws-key', pattern: /\bAKIA[0-9A-Z]{16}\b/, message: 'AWS-Zugangsschlüssel im Code' },
  { id: 'secret-token', pattern: /\b(gh[pousr]_[A-Za-z0-9]{36,}|sk-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{10,})/, message: 'API-Token im Code' },
  {
    id: 'secret-hardcoded',
    pattern: /\b(password|passwort|passwd|secret|api_?key|token)\b\s*[:=]\s*["'][^"'\s]{6,}["']/i,
    message: 'Fest eingetragenes Passwort/Geheimnis – aus Umgebungsvariable oder Secret-Store laden',
  },
  { id: 'eval', pattern: /(^|[^\w.])eval\s*\(/, message: 'eval() führt beliebigen Code aus', ext: CODE },
  { id: 'new-function', pattern: /\bnew Function\s*\(/, message: 'new Function() führt beliebigen Code aus', ext: JS },
  { id: 'inner-html', pattern: /\.(innerHTML|outerHTML)\s*=|dangerouslySetInnerHTML|document\.write\s*\(/, message: 'Mögliches XSS: ungeprüftes HTML einsetzen', ext: JS },
  { id: 'js-exec', pattern: /\bexec(Sync)?\s*\(\s*`[^`]*\$\{/, message: 'Command Injection: Shell-Befehl mit eingesetzten Variablen – execFile mit Argumentliste nutzen', ext: JS },
  { id: 'py-shell', pattern: /shell\s*=\s*True/, message: 'subprocess mit shell=True – Command Injection möglich', ext: PY },
  { id: 'py-os-system', pattern: /\bos\.(system|popen)\s*\(/, message: 'os.system/os.popen – Command Injection möglich, subprocess mit Liste nutzen', ext: PY },
  { id: 'py-exec', pattern: /(^|[^\w.])exec\s*\(/, message: 'exec() führt beliebigen Code aus', ext: PY },
  { id: 'py-pickle', pattern: /\b(pickle|cPickle|dill)\.loads?\s*\(/, message: 'pickle.load mit fremden Daten erlaubt Codeausführung', ext: PY },
  { id: 'py-yaml', pattern: /\byaml\.load\s*\((?![^)]*SafeLoader)/, message: 'yaml.load ohne SafeLoader – yaml.safe_load nutzen', ext: PY },
  { id: 'tls-off', pattern: /verify\s*=\s*False|rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED|InsecureSkipVerify\s*:\s*true/, message: 'TLS-Zertifikatsprüfung ausgeschaltet' },
  {
    id: 'sql-injection',
    pattern: /(["'`]|f["'])\s*(SELECT|INSERT|UPDATE|DELETE)\b[^"'`]*(["'`]\s*\+|\$\{|\{[a-z_]|%s["']\s*%)/i,
    message: 'SQL-Injection: Abfrage aus String zusammengebaut – Platzhalter/Parameter nutzen',
  },
  { id: 'weak-hash', pattern: /\b(md5|sha1)\s*\(|createHash\(\s*["'](md5|sha1)["']|hashlib\.(md5|sha1)\b/i, message: 'MD5/SHA1 sind für Passwörter/Signaturen unsicher', ext: CODE },
  { id: 'weak-random', pattern: /Math\.random\(\).*(token|secret|password|key|id)|(token|secret|password|key)\w*\s*=.*Math\.random\(\)/i, message: 'Math.random ist nicht kryptografisch sicher – crypto.randomUUID/getRandomValues nutzen', ext: JS },
  { id: 'chmod-777', pattern: /chmod\s+(-R\s+)?777|0o?777\b/, message: 'Rechte 777 – jeder darf schreiben' },
  { id: 'debug-on', pattern: /\bDEBUG\s*=\s*True\b|app\.run\([^)]*debug\s*=\s*True/, message: 'Debug-Modus aktiv – nicht in Produktion', ext: PY },
]

export function scanSecurity(path: string, text: string): Finding[] {
  const found: Finding[] = []
  const lines = text.split('\n')
  for (const rule of RULES) {
    if (rule.ext && !rule.ext.test(path)) continue
    lines.forEach((line, i) => {
      if (line.length > 2000 || /selbst-check:\s*ok/i.test(line)) return
      if (rule.pattern.test(line)) found.push({ line: i + 1, rule: rule.id, message: rule.message })
    })
  }
  return found
}
