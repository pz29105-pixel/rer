import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import Editor from './src/Editor';

export default function App() {
  const [fotoUri, setFotoUri] = useState<string | null>(null);

  const fotoAufnehmen = async () => {
    const recht = await ImagePicker.requestCameraPermissionsAsync();
    if (!recht.granted) {
      Alert.alert('Kamera', 'Bitte erlauben Sie den Zugriff auf die Kamera in den Einstellungen.');
      return;
    }
    const ergebnis = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!ergebnis.canceled) setFotoUri(ergebnis.assets[0].uri);
  };

  const ausGalerie = async () => {
    const ergebnis = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!ergebnis.canceled) setFotoUri(ergebnis.assets[0].uri);
  };

  if (fotoUri) {
    return (
      <>
        <Editor fotoUri={fotoUri} onNeuesFoto={() => setFotoUri(null)} />
        <StatusBar style="light" />
      </>
    );
  }

  return (
    <View style={styles.start}>
      <Text style={styles.titel}>Klima-Planer</Text>
      <Text style={styles.text}>
        Fotografieren Sie die Wand beim Kunden und zeigen Sie, wo das Klimagerät hinkommt.
      </Text>
      <Pressable style={styles.knopf} onPress={fotoAufnehmen}>
        <Text style={styles.knopfText}>Foto aufnehmen</Text>
      </Pressable>
      <Pressable style={[styles.knopf, styles.knopfHell]} onPress={ausGalerie}>
        <Text style={[styles.knopfText, styles.knopfTextHell]}>Aus Galerie wählen</Text>
      </Pressable>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  start: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', padding: 24, gap: 16 },
  titel: { fontSize: 30, fontWeight: '700', color: '#0d47a1' },
  text: { fontSize: 16, color: '#444', marginBottom: 12 },
  knopf: { backgroundColor: '#1e88e5', borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  knopfHell: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#1e88e5' },
  knopfText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  knopfTextHell: { color: '#1e88e5' },
});
