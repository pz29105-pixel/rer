import { Body, H1, Muted, Screen } from '../components/ui';

export default function SetupScreen() {
  return (
    <Screen>
      <H1>Einrichtung fehlt</H1>
      <Muted>Die App ist noch nicht mit Supabase verbunden.</Muted>
      <Body style={{ marginTop: 16 }}>
        1. Datei „.env.example“ nach „.env“ kopieren.{'\n'}
        2. URL und Anon-Key aus Supabase eintragen.{'\n'}
        3. Die App neu starten.{'\n\n'}
        Die ausführliche Anleitung steht in docs/ANLEITUNG.md.
      </Body>
    </Screen>
  );
}
