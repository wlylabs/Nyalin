import { useSyncExternalStore } from 'react';

import type { MediaKind } from '../lib/media';
import type { Receipt } from '../lib/receipt';

/**
 * Riwayat disimpan hanya di browser ini (localStorage).
 * Yang disimpan: nota, teks hasil baca + thumbnail kecil (gambar) atau durasi (suara).
 * Gambar dan rekaman suara asli tidak pernah disimpan.
 */
export interface HistoryEntry {
  id: string;
  createdAt: number;
  /** Entri lama (sebelum ada voice note) tidak punya field ini → dianggap gambar. "manual" = nota tanpa foto/suara. */
  kind?: MediaKind | 'manual';
  fileName: string;
  /** Data URL JPEG kecil (±200px). Kosong untuk suara. */
  thumbnail: string;
  /** Durasi suara dalam detik. */
  duration?: number | null;
  text: string;
  /** Nota digital dari hasil ini. */
  receipt?: Receipt | null;
}

export type HistoryPatch = Partial<Pick<HistoryEntry, 'text' | 'receipt'>>;

const STORAGE_KEY = 'nyalin:history:v1';
const MAX_ENTRIES = 30;

type Listener = () => void;
const listeners = new Set<Listener>();
let cache: HistoryEntry[] | null = null;

function read(): HistoryEntry[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? (parsed as HistoryEntry[]).filter((e) => e && typeof e.id === 'string') : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(entries: HistoryEntry[]) {
  cache = entries;
  let toSave = entries;
  // Jika kuota penuh, buang entri tertua sampai muat.
  while (true) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      break;
    } catch {
      if (toSave.length === 0) break;
      toSave = toSave.slice(0, -1);
    }
  }
  cache = toSave;
  listeners.forEach((l) => l());
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function createId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const historyStore = {
  list: read,
  get(id: string) {
    return read().find((e) => e.id === id) ?? null;
  },
  add(entry: Omit<HistoryEntry, 'id' | 'createdAt'>): HistoryEntry {
    const full: HistoryEntry = { ...entry, id: createId(), createdAt: Date.now() };
    write([full, ...read()].slice(0, MAX_ENTRIES));
    return full;
  },
  update(id: string, patch: HistoryPatch) {
    const entries = read();
    if (!entries.some((e) => e.id === id)) return;
    write(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  },
  updateText(id: string, text: string) {
    historyStore.update(id, { text });
  },
  /** Mengembalikan entri yang baru dihapus (untuk "Urungkan"). */
  restore(entry: HistoryEntry) {
    const entries = read().filter((e) => e.id !== entry.id);
    write([...entries, entry].sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_ENTRIES));
  },
  remove(id: string) {
    write(read().filter((e) => e.id !== id));
  },
  clear() {
    write([]);
  },
  /** Untuk pengujian. */
  _reset() {
    cache = null;
  },
};

export function useHistory(): HistoryEntry[] {
  return useSyncExternalStore(subscribe, read, () => []);
}
