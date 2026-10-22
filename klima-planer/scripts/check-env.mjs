// Prüft vor dem ersten Start, ob die Supabase-Zugangsdaten in .env stehen.
import { existsSync, readFileSync } from 'node:fs';

if (!existsSync('.env')) {
  console.error('Fehlt: .env. Kopiere .env.example nach .env und trage die Werte aus Supabase ein.');
  process.exit(1);
}
const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const problems = [];
const url = env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url) || url.includes('DEIN-PROJEKT')) {
  problems.push('EXPO_PUBLIC_SUPABASE_URL fehlt oder hat nicht die Form https://xxxx.supabase.co');
}
if (key.length < 30 || key.startsWith('dein-')) {
  problems.push('EXPO_PUBLIC_SUPABASE_ANON_KEY fehlt (Project Settings -> API -> anon public).');
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('OK: Supabase-Zugangsdaten sind eingetragen. Starte jetzt: npx expo start');
