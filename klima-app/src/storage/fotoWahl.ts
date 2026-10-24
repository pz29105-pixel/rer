import * as ImagePicker from 'expo-image-picker'
import { Alert } from 'react-native'
import { sichereBild } from './bilder'

/** Foto per Kamera oder Galerie holen und dauerhaft in der App speichern. */
export async function waehleFoto(quelle: 'kamera' | 'galerie', optionen: { quadrat?: boolean; endung?: string } = {}): Promise<string | undefined> {
  const erlaubnis =
    quelle === 'kamera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!erlaubnis.granted) {
    Alert.alert(
      quelle === 'kamera' ? 'Kamerazugriff fehlt' : 'Zugriff auf Fotos fehlt',
      'Bitte erlaube den Zugriff in den Einstellungen deines Geräts, damit die App Fotos verwenden kann.',
    )
    return undefined
  }
  const ergebnis =
    quelle === 'kamera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 })
  if (ergebnis.canceled || !ergebnis.assets[0]) return undefined
  return sichereBild(ergebnis.assets[0].uri, optionen.endung ?? 'jpg')
}

/** Fragt, ob Kamera oder Galerie genutzt werden soll. */
export function frageQuelle(): Promise<'kamera' | 'galerie' | undefined> {
  return new Promise(res =>
    Alert.alert('Foto hinzufügen', 'Woher soll das Foto kommen?', [
      { text: 'Kamera', onPress: () => res('kamera') },
      { text: 'Galerie', onPress: () => res('galerie') },
      { text: 'Abbrechen', style: 'cancel', onPress: () => res(undefined) },
    ]),
  )
}
