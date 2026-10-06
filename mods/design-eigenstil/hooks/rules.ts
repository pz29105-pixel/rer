// Erkennt Muster, die eine Oberfläche nach Vorlage aussehen lassen.
// Eine Zeile mit "design-ok" wird übersprungen (bewusste Entscheidung).

export type Finding = { rule: string; message: string; line?: number }

export const UI_FILE = /\.(html?|css|scss|sass|less|jsx|tsx|vue|svelte|astro)$/i

type LineRule = { id: string; pattern: RegExp; message: string }

const LINE_RULES: LineRule[] = [
  {
    id: 'standard-schrift',
    pattern: /font-family\s*:\s*["']?(Inter|Roboto|Arial|Helvetica|Open Sans|Lato|Montserrat|Poppins)\b|fonts\.googleapis\.com\/css2?\?family=(Inter|Roboto|Poppins|Montserrat|Open\+Sans|Lato)\b/i,
    message: 'Standard-Schrift (Inter/Roboto/Poppins/Arial …). Wähle eine Display-Schrift mit Charakter und eine passende Textschrift.',
  },
  {
    id: 'system-schrift',
    pattern: /font-family\s*:\s*(-apple-system|system-ui|BlinkMacSystemFont)/i,
    message: 'Nur Systemschrift als Hauptschrift – wirkt wie ein ungestaltetes Formular.',
  },
  {
    id: 'ki-verlauf',
    pattern: /#667eea|#764ba2|from-(purple|violet|indigo)-\d{3}\s+(via|to)-(blue|indigo|pink|purple)-\d{3}|linear-gradient\([^)]*(purple|violet|#8b5cf6|#7c3aed|#6366f1)[^)]*(blue|#3b82f6|#06b6d4)/i,
    message: 'Lila-Blau-Verlauf: das bekannteste KI-Standard-Design. Nimm eine eigene Farbwelt.',
  },
  {
    id: 'tailwind-indigo',
    pattern: /\b(bg|text|border|ring|from|to)-indigo-(500|600)\b/,
    message: 'Tailwind-Standardfarbe Indigo – sieht aus wie jede Vorlage. Eigene Farben als Tokens festlegen.',
  },
  {
    id: 'emoji-icons',
    pattern: /[>"'`]\s*[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u,
    message: 'Emoji als Icons. Nutze ein einheitliches SVG-Icon-Set oder eigene Formen.',
  },
  {
    id: 'floskel-text',
    pattern: /Welcome to|Unlock the (power|potential)|Seamless(ly)?\b|Revolutioni[sz]e|Elevate your|Lorem ipsum|Get started today|Willkommen (bei|auf|zu)|Entdecke die Zukunft|nahtlos|Next[- ]level/i,
    message: 'Floskel-Text. Schreib konkret, was das Produkt tut und für wen.',
  },
  {
    id: 'standard-schatten',
    pattern: /box-shadow\s*:\s*0 (4px 6px|2px 4px|1px 3px) rgba\(0,\s*0,\s*0,\s*0?\.1\)/i,
    message: 'Standard-Schatten aus der Vorlage. Schatten gezielt gestalten (Farbe, Richtung, Schichten) oder weglassen.',
  },
]

export function scanDesign(path: string, text: string): Finding[] {
  if (!UI_FILE.test(path)) return []
  const found: Finding[] = []
  const lines = text.split('\n')

  for (const rule of LINE_RULES) {
    const index = lines.findIndex(l => l.length < 3000 && !/design-ok/i.test(l) && rule.pattern.test(l))
    if (index >= 0) found.push({ rule: rule.id, message: rule.message, line: index + 1 })
  }

  // Muster über die ganze Datei
  const cardLook = (text.match(/\brounded-(lg|xl|2xl)\b/g)?.length ?? 0) + (text.match(/\bshadow-(md|lg|xl)\b/g)?.length ?? 0)
  if (cardLook >= 8) {
    found.push({ rule: 'einheits-karten', message: 'Überall die gleichen abgerundeten Karten mit Schatten. Variiere Formen, Größen und Ebenen.' })
  }

  const hexColors = new Set(text.match(/#[0-9a-f]{6}\b/gi)?.map(c => c.toLowerCase()) ?? [])
  if (/\.(css|scss|html?)$/i.test(path) && hexColors.size >= 6 && !/--[\w-]+\s*:/.test(text)) {
    found.push({ rule: 'keine-farb-tokens', message: `${hexColors.size} Farben ohne CSS-Variablen. Leg eine bewusste Palette als Tokens an (Grundfarbe + klarer Akzent).` })
  }

  const centered = text.match(/text-align\s*:\s*center|\btext-center\b/g)?.length ?? 0
  if (centered >= 8) {
    found.push({ rule: 'alles-zentriert', message: 'Fast alles ist zentriert. Asymmetrie und ein klares Raster wirken eigenständiger.' })
  }

  return found
}
