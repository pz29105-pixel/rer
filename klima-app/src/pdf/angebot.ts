import * as FileSystem from 'expo-file-system/legacy'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { berechneRaum } from '../logic/kuehllast'
import { berechneKosten, euro } from '../logic/kosten'
import { TYP_NAMEN } from '../components/geraeteBild'
import { alsDataUri } from '../storage/bilder'
import { BRANDING } from '../data/defaults'
import type { AppDaten, Kunde, Projekt } from '../types'

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')
const zahl = (n: number) => String(n).replace('.', ',')
const datum = (d: Date) => d.toLocaleDateString('de-DE')

/** Baut das Angebot als HTML. Bilder werden als Base64 eingebettet, damit alles offline funktioniert. */
export async function baueAngebotHtml(projekt: Projekt, kunde: Kunde, daten: AppDaten): Promise<string> {
  const { einstellungen: e, geraete } = daten
  const kosten = berechneKosten(projekt, geraete, e)
  const heute = new Date()
  const gueltigBis = new Date(heute.getTime() + e.texte.gueltigkeitTage * 86_400_000)
  const logo = await alsDataUri(e.firma.logoUri, 'image/png')
  const farbe = BRANDING.hauptfarbe

  const raumHtml = projekt.raeume
    .map(r => {
      const k = berechneRaum(r)
      const g = geraete.find(x => x.id === r.geraetId)
      return `<tr><td>${esc(r.name)}</td><td>${zahl(r.laenge)} × ${zahl(r.breite)} × ${zahl(r.hoehe)} m</td><td>${esc(r.nutzung)}, ${r.himmelsrichtung}</td><td>${zahl(k.kw)} kW</td><td>${g ? esc(g.name) : '–'}</td></tr>`
    })
    .join('')

  const bilder: { titel: string; uri?: string }[] = [
    ...projekt.raeume.map(r => ({ titel: `${r.name}: Innengerät und Leitungsweg`, uri: r.innen?.render ?? r.innen?.foto })),
    { titel: 'Außengerät und Leitungsweg', uri: projekt.aussen?.render ?? projekt.aussen?.foto },
  ]
  let bilderHtml = ''
  for (const b of bilder) {
    const data = await alsDataUri(b.uri)
    if (data) bilderHtml += `<div class="bild"><img src="${data}"/><div>${esc(b.titel)}</div></div>`
  }

  const geraeteHtml = [...projekt.raeume.map(r => geraete.find(g => g.id === r.geraetId)), geraete.find(g => g.id === projekt.aussengeraetId)]
    .filter((g, i, a): g is NonNullable<typeof g> => !!g && a.indexOf(g) === i)
    .map(g => `<tr><td>${esc(g.hersteller)} ${esc(g.name)}</td><td>${TYP_NAMEN[g.typ]}</td><td>${zahl(g.kuehlleistung)} / ${zahl(g.heizleistung)} kW</td><td>${g.breite} × ${g.hoehe} × ${g.tiefe} mm</td></tr>`)
    .join('')

  const kostenHtml = kosten.positionen
    .map(p => `<tr><td>${esc(p.text)}</td><td class="r">${p.menge}</td><td class="r">${euro(p.einzelpreis)}</td><td class="r">${euro(p.summe)}</td></tr>`)
    .join('')

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"/><style>
  body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1B2430;font-size:12px;margin:0;padding:28px}
  h1{color:${farbe};font-size:22px;margin:18px 0 4px} h2{color:${farbe};font-size:15px;margin:22px 0 6px;border-bottom:2px solid ${farbe};padding-bottom:3px}
  table{width:100%;border-collapse:collapse} th{text-align:left;background:#EEF3F9;padding:6px} td{padding:6px;border-bottom:1px solid #E1E7EF;vertical-align:top}
  .r{text-align:right} .kopf{display:flex;justify-content:space-between;align-items:flex-start} .logo{max-height:70px;max-width:200px}
  .summe td{font-weight:700;border:0} .bild{display:inline-block;width:48%;margin:1%;vertical-align:top;page-break-inside:avoid}
  .bild img{width:100%;border-radius:6px} .unterschrift{margin-top:50px;display:flex;gap:40px} .unterschrift div{flex:1;border-top:1px solid #1B2430;padding-top:4px;font-size:11px}
  </style></head><body>
  <div class="kopf"><div>${logo ? `<img class="logo" src="${logo}"/>` : `<b style="font-size:18px;color:${farbe}">${esc(e.firma.name)}</b>`}</div>
  <div class="r">${esc(e.firma.name)}<br/>${esc(e.firma.adresse)}<br/>Tel. ${esc(e.firma.telefon)}<br/>${esc(e.firma.email)}</div></div>
  <p style="margin-top:24px">${esc(kunde.name)}<br/>${esc(kunde.adresse)}</p>
  <h1>Angebot ${esc(projekt.angebotsnummer)}</h1>
  <div>Datum: ${datum(heute)} · gültig bis: ${datum(gueltigBis)}</div>
  <p>${esc(e.texte.einleitung)}</p>
  <h2>Räume und Kühlleistung</h2>
  <table><tr><th>Raum</th><th>Maße</th><th>Nutzung</th><th>Leistung</th><th>Gerät</th></tr>${raumHtml}</table>
  <p style="font-size:10px;color:#5B6573">Die Leistung ist eine Schätzung per Faustformel und ersetzt keine normgerechte Heiz- bzw. Kühllastberechnung.</p>
  <h2>Gewählte Geräte</h2>
  <table><tr><th>Gerät</th><th>Typ</th><th>Kühlen / Heizen</th><th>Maße</th></tr>${geraeteHtml}</table>
  ${bilderHtml ? `<h2>Visualisierung</h2>${bilderHtml}` : ''}
  <h2>Kostenaufstellung</h2>
  <table><tr><th>Position</th><th class="r">Menge</th><th class="r">Einzelpreis</th><th class="r">Summe</th></tr>${kostenHtml}
  <tr class="summe"><td colspan="3" class="r">Netto</td><td class="r">${euro(kosten.netto)}</td></tr>
  <tr class="summe"><td colspan="3" class="r">MwSt. ${kosten.mwstSatz} %</td><td class="r">${euro(kosten.mwst)}</td></tr>
  <tr class="summe"><td colspan="3" class="r" style="font-size:14px">Gesamt brutto</td><td class="r" style="font-size:14px">${euro(kosten.brutto)}</td></tr></table>
  <p>${esc(e.texte.zahlung)}</p><p>${esc(e.texte.schluss)}</p>
  <p>Dieses Angebot ist gültig bis ${datum(gueltigBis)}.</p>
  <div class="unterschrift"><div>Ort, Datum</div><div>Unterschrift Kunde</div></div>
  </body></html>`
}

/** Erzeugt das PDF und gibt den Pfad zurück. */
export async function erzeugePdf(projekt: Projekt, kunde: Kunde, daten: AppDaten): Promise<string> {
  const html = await baueAngebotHtml(projekt, kunde, daten)
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 })
  // Sprechenden Dateinamen vergeben, damit er beim Teilen sinnvoll erscheint.
  const ziel = `${FileSystem.documentDirectory}Angebot_${projekt.angebotsnummer}.pdf`
  await FileSystem.deleteAsync(ziel, { idempotent: true })
  await FileSystem.moveAsync({ from: uri, to: ziel })
  return ziel
}

/** Öffnet das Teilen-Menü (E-Mail, WhatsApp, In Dateien sichern …). */
export async function teilePdf(pfad: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Teilen wird auf diesem Gerät nicht unterstützt.')
  await Sharing.shareAsync(pfad, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Angebot teilen' })
}
