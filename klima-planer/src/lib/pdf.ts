import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { buildPdfHtml, type PdfInput } from '../logic/pdfHtml';
import { signedUrl } from './repo';

async function toDataUri(bucket: 'photos' | 'devices', path: string, mime: string): Promise<string> {
  const url = await signedUrl(bucket, path);
  const blob = await (await fetch(url)).blob();
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => {
      const res = String(r.result);
      // Manche Plattformen liefern einen unbrauchbaren Typ; wir setzen ihn selbst.
      resolve(res.replace(/^data:[^;]*;/, `data:${mime};`));
    };
    r.onerror = () => reject(new Error('Bild konnte nicht gelesen werden.'));
    r.readAsDataURL(blob);
  });
}

export async function createAndSharePdf(
  base: Omit<PdfInput, 'photo' | 'deviceImages'> & { photoPath: string | null },
): Promise<void> {
  const photo = base.photoPath ? await toDataUri('photos', base.photoPath, 'image/jpeg') : null;
  const deviceImages: Record<string, string> = {};
  const used = new Set(base.placements.map(p => p.deviceId));
  for (const d of base.devices) {
    if (used.has(d.id)) deviceImages[d.id] = await toDataUri('devices', d.imagePath, 'image/png');
  }
  const html = buildPdfHtml({ ...base, photo, deviceImages });
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Angebot teilen', UTI: 'com.adobe.pdf' });
  } else {
    throw new Error('Teilen wird auf diesem Gerät nicht unterstützt.');
  }
}
