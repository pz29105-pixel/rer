import { useEffect, useState } from 'react';
import { signedUrl } from './repo';

const cache = new Map<string, { url: string; at: number }>();

/** Liefert eine temporäre Bild-Adresse für eine private Datei im Speicher. */
export function useSignedUrl(bucket: 'photos' | 'devices', path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) { setUrl(null); return; }
    const key = bucket + '/' + path;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < 50 * 60 * 1000) { setUrl(hit.url); return; }
    let alive = true;
    signedUrl(bucket, path)
      .then(u => { cache.set(key, { url: u, at: Date.now() }); if (alive) setUrl(u); })
      .catch(() => { if (alive) setUrl(null); });
    return () => { alive = false; };
  }, [bucket, path]);
  return url;
}

/** Lädt eine Funktion beim Öffnen und bei jedem Zurückkehren auf den Bildschirm neu. */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    load()
      .then(d => { if (alive) { setData(d); setError(null); } })
      .catch(e => { if (alive) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, error, loading, reload: () => setTick(t => t + 1) };
}
