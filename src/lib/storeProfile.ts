import type { ReceiptDefaults } from './receipt';

/**
 * Profil toko & penomoran nota, disimpan di browser ini saja.
 * Nama dan alamat toko yang terakhir diketik di nota dipakai lagi untuk nota berikutnya,
 * sehingga penjual tidak perlu mengetik ulang identitas tokonya.
 */
export interface StoreProfile {
  name: string;
  address: string;
}

const PROFILE_KEY = 'nyalin:toko:v1';
const COUNTER_KEY = 'nyalin:nomor-nota:v1';

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function getStoreProfile(): StoreProfile {
  const saved = readJson<Partial<StoreProfile>>(PROFILE_KEY);
  return { name: saved?.name ?? '', address: saved?.address ?? '' };
}

export function saveStoreProfile(profile: StoreProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Kuota penuh / mode privat: profil hanya tidak diingat.
  }
}

function readCounter(): number {
  const value = readJson<number>(COUNTER_KEY) ?? 0;
  return Number.isFinite(value) ? value : 0;
}

/** Nomor nota berikutnya ("0001", "0002", …) tanpa memakainya — nota kosong tidak menghabiskan nomor. */
export function peekReceiptNumber(): string {
  return String(readCounter() + 1).padStart(4, '0');
}

/** Tandai nomor sudah terpakai (dipanggil saat nota pertama kali tersimpan). */
export function claimReceiptNumber(number: string): void {
  const value = Number(number);
  if (!Number.isInteger(value) || value <= readCounter()) return;
  try {
    localStorage.setItem(COUNTER_KEY, JSON.stringify(value));
  } catch {
    // Mode privat / kuota penuh: nomor hanya tidak diingat.
  }
}

/** Nilai awal nota baru: identitas toko dari profil + nomor nota berikutnya. */
export function receiptDefaults(): ReceiptDefaults {
  const profile = getStoreProfile();
  return { title: profile.name, address: profile.address, number: peekReceiptNumber() };
}
