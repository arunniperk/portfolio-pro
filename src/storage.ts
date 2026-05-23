interface ElectronAPI {
  storageRead: (key: string) => Promise<string | null>;
  storageWrite: (key: string, value: string) => Promise<void>;
  netFetch: (url: string, options?: Record<string, unknown>) => Promise<string | null>;
  fileSave: (filename: string, content: string) => Promise<void>;
  flushComplete: () => void;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  installUpdate: () => void;
  onUpdateAvailable: (cb: () => void) => void;
  onAppClosing: (cb: () => void) => void;
  scrapeInvesting: (symbol: string) => Promise<Record<string, unknown> | null>;
  scrapeMcNps: (pfm: string) => Promise<string | null>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

const isElectron = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.electronAPI !== 'undefined' &&
  typeof window.electronAPI.storageRead === 'function';

const _cache: Record<string, string | null> = {};

export async function getItem(key: string): Promise<string | null> {
  if (!isElectron()) {
    return localStorage.getItem(key);
  }
  if (Object.prototype.hasOwnProperty.call(_cache, key)) {
    return _cache[key];
  }
  const raw = await window.electronAPI!.storageRead(key);
  _cache[key] = raw ?? null;
  return _cache[key];
}

export async function setItem(key: string, value: string): Promise<void> {
  _cache[key] = value;
  if (!isElectron()) {
    localStorage.setItem(key, value);
    return;
  }
  await window.electronAPI!.storageWrite(key, value);
}

const KNOWN_KEYS = [
  'pm_portfolios', 'pm_activeId', 'pm_tweaks',
  'pm_groq_key', 'pm_gemini_key', 'pm_primary_ai',
  'pm_alerts', 'pm_sectors', 'pm_portfolio_history',
  'pm_watchlist', 'pm_lots', 'pm_sold_lots', 'pm_notes',
  'pm_nps', 'pm_nps_navs', 'pm_nps_growth', 'pm_gold', 'pm_pin', 'pm_gold_api_key',
  'pm_mf', 'pm_ppf', 'pm_emergency',
  'pm_sidebar_collapsed', 'pm_right_sidebar_collapsed',
  'pm_goals', 'pm_dividends', 'pm_rebalance_targets', 'pm_reminders',
  'pm_compare', 'pm_assessment_result', 'pm_last_assessment',
  'pm_auto_backup', 'pm_backup_freq',
];

async function migrateFromLocalStorage(): Promise<void> {
  if (!isElectron()) return;
  const alreadyMigrated = await window.electronAPI!.storageRead('pm_migrated');
  if (alreadyMigrated) {
    console.log('[storage] Migration already done, skipping.');
    return;
  }
  console.log('[storage] Starting one-time migration from localStorage → Documents\\Portfolio\\');
  let migratedCount = 0;

  await Promise.all(KNOWN_KEYS.map(async (key) => {
    let lsValue: string | null = null;
    try { lsValue = localStorage.getItem(key); } catch {}

    if (lsValue !== null && lsValue !== undefined) {
      const fileValue = await window.electronAPI!.storageRead(key);
      if (!fileValue) {
        await window.electronAPI!.storageWrite(key, lsValue);
        _cache[key] = lsValue;
        migratedCount++;
        console.log(`[storage] Migrated: ${key}`);
      }
    }
  }));

  await window.electronAPI!.storageWrite('pm_migrated', JSON.stringify({ migratedAt: new Date().toISOString(), keys: migratedCount }));
  _cache['pm_migrated'] = JSON.stringify({ migratedAt: new Date().toISOString(), keys: migratedCount });
  console.log(`[storage] Migration complete — ${migratedCount} key(s) migrated.`);
}

let _loaded = false;

export async function preloadStorage(): Promise<void> {
  if (_loaded) return;
  await migrateFromLocalStorage();
  if (isElectron()) {
    await Promise.all([...KNOWN_KEYS, 'pm_migrated'].map(async (k) => {
      if (!Object.prototype.hasOwnProperty.call(_cache, k)) {
        const raw = await window.electronAPI!.storageRead(k);
        _cache[k] = raw ?? null;
      }
    }));
  }
  _loaded = true;
}

export function getItemSync(key: string): string | null {
  if (Object.prototype.hasOwnProperty.call(_cache, key)) return _cache[key];
  try { return localStorage.getItem(key); } catch { return null; }
}

export function setItemSync(key: string, value: string): void {
  _cache[key] = value;
  if (!isElectron()) {
    try { localStorage.setItem(key, value); } catch {}
    return;
  }
  window.electronAPI!.storageWrite(key, value).catch((e: unknown) =>
    console.error('[storage] write error', key, e)
  );
}

export async function flushAll(): Promise<void> {
  if (!isElectron()) return;
  const entries = Object.entries(_cache).filter(([, v]) => v !== null);
  if (!entries.length) return;
  await Promise.all(
    entries.map(([key, value]) =>
      window.electronAPI!.storageWrite(key, value as string).catch((e: unknown) =>
        console.error('[storage] flushAll write error', key, e)
      )
    )
  );
  console.log(`[storage] flushAll — ${entries.length} key(s) written.`);
}
