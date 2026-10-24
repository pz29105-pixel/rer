import AsyncStorage from '@react-native-async-storage/async-storage'
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { STANDARD_DATEN } from '../data/defaults'
import type { AppDaten, Geraet, Kunde, Projekt, Raum } from '../types'

const SCHLUESSEL = 'klimaplaner.daten.v1'

/** Kurze, lokal eindeutige ID (kein Netzwerk nötig). */
export const neueId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

interface Store {
  geladen: boolean
  daten: AppDaten
  /** Ändert die Daten und speichert sie sofort auf dem Gerät. */
  aendere: (fn: (d: AppDaten) => AppDaten) => void
  speichereKunde: (k: Kunde) => void
  loescheKunde: (id: string) => void
  speichereProjekt: (p: Projekt) => void
  speichereRaum: (projektId: string, r: Raum) => void
  loescheRaum: (projektId: string, raumId: string) => void
  speichereGeraet: (g: Geraet) => void
  loescheGeraet: (id: string) => void
}

const Ctx = createContext<Store | null>(null)

const ersetzeOderFuegeEin = <T extends { id: string }>(liste: T[], x: T) =>
  liste.some(e => e.id === x.id) ? liste.map(e => (e.id === x.id ? x : e)) : [...liste, x]

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [daten, setDaten] = useState<AppDaten>(STANDARD_DATEN)
  const [geladen, setGeladen] = useState(false)
  const aktuell = useRef(daten)

  useEffect(() => {
    AsyncStorage.getItem(SCHLUESSEL)
      .then(roh => {
        if (roh) {
          const gespeichert = JSON.parse(roh) as AppDaten
          // Fehlende Felder aus neueren App-Versionen mit Standardwerten auffüllen.
          const merged: AppDaten = {
            ...STANDARD_DATEN,
            ...gespeichert,
            einstellungen: {
              ...STANDARD_DATEN.einstellungen,
              ...gespeichert.einstellungen,
              preise: { ...STANDARD_DATEN.einstellungen.preise, ...gespeichert.einstellungen?.preise },
              texte: { ...STANDARD_DATEN.einstellungen.texte, ...gespeichert.einstellungen?.texte },
            },
          }
          aktuell.current = merged
          setDaten(merged)
        }
      })
      .catch(() => {}) // Beschädigte Daten: mit Standardwerten starten
      .finally(() => setGeladen(true))
  }, [])

  const aendere = useCallback((fn: (d: AppDaten) => AppDaten) => {
    const neu = fn(aktuell.current)
    aktuell.current = neu
    setDaten(neu)
    AsyncStorage.setItem(SCHLUESSEL, JSON.stringify(neu)).catch(() => {})
  }, [])

  const store: Store = {
    geladen,
    daten,
    aendere,
    speichereKunde: k => aendere(d => ({ ...d, kunden: ersetzeOderFuegeEin(d.kunden, k) })),
    loescheKunde: id =>
      aendere(d => ({
        ...d,
        kunden: d.kunden.filter(k => k.id !== id),
        projekte: d.projekte.filter(p => p.kundeId !== id),
      })),
    speichereProjekt: p => aendere(d => ({ ...d, projekte: ersetzeOderFuegeEin(d.projekte, p) })),
    speichereRaum: (projektId, r) =>
      aendere(d => ({
        ...d,
        projekte: d.projekte.map(p => (p.id === projektId ? { ...p, raeume: ersetzeOderFuegeEin(p.raeume, r) } : p)),
      })),
    loescheRaum: (projektId, raumId) =>
      aendere(d => ({
        ...d,
        projekte: d.projekte.map(p => (p.id === projektId ? { ...p, raeume: p.raeume.filter(r => r.id !== raumId) } : p)),
      })),
    speichereGeraet: g => aendere(d => ({ ...d, geraete: ersetzeOderFuegeEin(d.geraete, g) })),
    loescheGeraet: id => aendere(d => ({ ...d, geraete: d.geraete.filter(g => g.id !== id) })),
  }
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore außerhalb des StoreProvider verwendet')
  return s
}

/** Projekt samt Kunde, immer in der aktuellen Fassung aus dem Store. */
export function useProjekt(id: string) {
  const { daten } = useStore()
  const projekt = daten.projekte.find(p => p.id === id)
  const kunde = daten.kunden.find(k => k.id === projekt?.kundeId)
  return { projekt, kunde }
}
