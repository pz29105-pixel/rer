import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text } from 'react-native';
import { supabase } from '../lib/supabase';
import { Body, Button, Field, H1, Muted, Screen, showError } from '../components/ui';
import { colors, fonts } from '../theme';

export default function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.includes('@') || password.length < 8) {
      Alert.alert('Bitte prüfen', 'Gültige E-Mail-Adresse und mindestens 8 Zeichen als Passwort eingeben.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (!data.session) {
          Alert.alert('Fast geschafft', 'Wir haben dir eine E-Mail geschickt. Bitte bestätige sie und melde dich dann an.');
          setMode('login');
        }
      }
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!email.includes('@')) { Alert.alert('Passwort vergessen', 'Trage oben deine E-Mail-Adresse ein.'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) showError(error);
    else Alert.alert('E-Mail gesendet', 'Folge dem Link in der E-Mail, um ein neues Passwort zu vergeben.');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Text style={{ fontFamily: fonts.serif, fontSize: 16, color: colors.muted, letterSpacing: 4, marginTop: 48 }}>
          KLIMA-PLANER
        </Text>
        <H1>{mode === 'login' ? 'Willkommen zurück' : 'Konto anlegen'}</H1>
        <Muted>Zeigen Sie Ihren Kunden vorab, wie die Anlage aussieht, und planen Sie den Einsatz gleich mit.</Muted>
        <Body style={{ height: 24 }}>{' '}</Body>
        <Field label="E-Mail" value={email} onChangeText={setEmail} autoCapitalize="none"
          keyboardType="email-address" autoComplete="email" />
        <Field label="Passwort" value={password} onChangeText={setPassword} secureTextEntry
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        <Button title={mode === 'login' ? 'Anmelden' : 'Registrieren'} onPress={submit} busy={busy} />
        <Button kind="ghost" title={mode === 'login' ? 'Neues Konto anlegen' : 'Ich habe schon ein Konto'}
          onPress={() => setMode(mode === 'login' ? 'register' : 'login')} />
        {mode === 'login' ? (
          <Pressable onPress={reset} style={{ padding: 16, alignItems: 'center' }}>
            <Muted>Passwort vergessen?</Muted>
          </Pressable>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
