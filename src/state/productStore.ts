import { useSyncExternalStore } from 'react';

/**
 * Daftar barang tersimpan, disimpan hanya di browser ini (localStorage).
 * Barang yang pernah diketik di nota diingat beserta harga terakhirnya, sehingga barang yang sama
 * cukup diklik dari saran / daftar cepat. Barang juga bisa ditambah & dihapus manual.
 */
export interface SavedProduct {
  name: string;
  /** Harga satuan terakhir (rupiah); 0 = belum ada harga. */
  price: number;
  /** Berapa kali dipakai — barang yang sering dipakai tampil lebih dulu. */
  uses: number;
  lastUsed: number;
}

const STORAGE_KEY = 'nyalin:barang:v1';
const MAX_PRODUCTS = 300;
const EMPTY: SavedProduct[] = [];

type Listener = () => void;
const listeners = new Set<Listener>();
let cache: SavedProduct[] | null = null;

/** Nama dirapikan: spasi ganda dibuang. Pencocokan tidak membedakan huruf besar/kecil. */
const cleanName = (name: string) => name.trim().replace(/\s+/g, ' ');
const keyOf = (name: string) => cleanName(name).toLocaleLowerCase('id-ID');

function isProduct(p: unknown): p is SavedProduct {
  const v = p as SavedProduct;
  return Boolean(v) && typeof v.name === 'string' && v.name.trim() !== '' && typeof v.price === 'number';
}

/** Urutan tampil: paling sering dipakai, lalu paling baru. */
const byPopularity = (a: SavedProduct, b: SavedProduct) => b.uses - a.uses || b.lastUsed - a.lastUsed;

function read(): SavedProduct[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed)
      ? parsed.filter(isProduct).map((p) => ({ ...p, uses: p.uses || 0, lastUsed: p.lastUsed || 0 }))
      : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(products: SavedProduct[]) {
  const sorted = [...products].sort(byPopularity).slice(0, MAX_PRODUCTS);
  cache = sorted;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  } catch {
    // Kuota penuh / mode privat: daftar hanya berlaku selama halaman terbuka.
  }
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

function upsert(name: string, price: number, countUse: boolean) {
  const clean = cleanName(name);
  if (!clean) return;
  const key = keyOf(clean);
  const products = read();
  const existing = products.find((p) => keyOf(p.name) === key);
  const next: SavedProduct = {
    name: clean,
    // Harga kosong tidak menimpa harga yang sudah tersimpan.
    price: price > 0 ? price : (existing?.price ?? 0),
    uses: (existing?.uses ?? 0) + (countUse ? 1 : 0),
    // Mengubah dari daftar barang tidak menggeser urutan (baris tidak melompat saat harga diketik).
    lastUsed: countUse || !existing ? Date.now() : existing.lastUsed,
  };
  if (existing && existing.name === next.name && existing.price === next.price && !countUse) return;
  write([next, ...products.filter((p) => p !== existing)]);
}

export const productStore = {
  list: read,
  find(name: string) {
    const key = keyOf(name);
    return key ? (read().find((p) => keyOf(p.name) === key) ?? null) : null;
  },
  /** Barang dipakai di nota: diingat (atau diperbarui harganya) dan dihitung pemakaiannya. */
  remember(name: string, price: number) {
    upsert(name, price, true);
  },
  /** Barang ditambah/diubah dari daftar barang, tanpa menambah hitungan pemakaian. */
  save(name: string, price: number) {
    upsert(name, price, false);
  },
  remove(name: string) {
    const key = keyOf(name);
    write(read().filter((p) => keyOf(p.name) !== key));
  },
  /** Mengembalikan barang yang baru dihapus (untuk "Urungkan"). */
  restore(product: SavedProduct) {
    const key = keyOf(product.name);
    write([product, ...read().filter((p) => keyOf(p.name) !== key)]);
  },
  /** Untuk pengujian. */
  _reset() {
    cache = null;
  },
};

/**
 * Saran barang untuk teks yang sedang diketik: nama yang diawali teks tersebut dulu, lalu yang
 * salah satu katanya diawali teks itu, lalu yang memuatnya di tengah. Barang yang namanya persis sama dengan ketikan tidak disarankan.
 */
export function suggestProducts(products: SavedProduct[], query: string, limit = 6): SavedProduct[] {
  const q = keyOf(query);
  if (!q) return products.slice(0, limit);
  const starts: SavedProduct[] = [];
  const wordStarts: SavedProduct[] = [];
  const contains: SavedProduct[] = [];
  for (const p of products) {
    const key = keyOf(p.name);
    if (key === q) continue;
    if (key.startsWith(q)) starts.push(p);
    else if (key.split(' ').some((word) => word.startsWith(q))) wordStarts.push(p);
    else if (key.includes(q)) contains.push(p);
  }
  return [...starts, ...wordStarts, ...contains].slice(0, limit);
}

export function useSavedProducts(): SavedProduct[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
