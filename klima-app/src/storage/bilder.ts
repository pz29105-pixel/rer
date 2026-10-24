import * as FileSystem from 'expo-file-system/legacy'

// Bilder aus Kamera/Galerie liegen nur im Cache. Wir kopieren sie in den
// Dokumentenordner der App, damit sie dauerhaft erhalten bleiben.
const ORDNER = (FileSystem.documentDirectory ?? '') + 'bilder/'

async function stelleOrdnerSicher() {
  const info = await FileSystem.getInfoAsync(ORDNER)
  if (!info.exists) await FileSystem.makeDirectoryAsync(ORDNER, { intermediates: true })
}

export async function sichereBild(quelle: string, endung = 'jpg'): Promise<string> {
  await stelleOrdnerSicher()
  const ziel = `${ORDNER}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${endung}`
  await FileSystem.copyAsync({ from: quelle, to: ziel })
  return ziel
}

/** Liest eine Datei als Base64-Data-URI (für das PDF). */
export async function alsDataUri(uri: string | undefined, mime = 'image/jpeg'): Promise<string | undefined> {
  if (!uri) return undefined
  try {
    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })
    return `data:${mime};base64,${b64}`
  } catch {
    return undefined
  }
}
