'use client';

import { useSyncExternalStore } from 'react';

/** Harus sama dengan src/sw/sw.ts */
const SHARE_CACHE = 'nyalin-share';
const SHARED_FILE_URL = '/__shared-file';

/* ── Instal aplikasi ─────────────────────────────────────────────────────── */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallState = 'unavailable' | 'available' | 'ios' | 'installed';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installState: InstallState = 'unavailable';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari() {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

let initialized = false;
/** Dipanggil sekali di client. Menangkap `beforeinstallprompt` supaya tombol "Pasang" kita yang menampilkan dialog. */
export function initInstallPrompt() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  if (isStandalone()) installState = 'installed';
  else if (isIosSafari()) installState = 'ios'; // iOS tidak punya prompt; tampilkan petunjuk manual
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    installState = 'available';
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installState = 'installed';
    emit();
  });
  emit();
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  if (installState === 'available') installState = 'unavailable';
  emit();
  return outcome === 'accepted';
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => installState,
    () => 'unavailable',
  );
}

/* ── File yang masuk dari luar ───────────────────────────────────────────── */

/** Mengambil file yang dibagikan lewat menu "Bagikan" (disimpan sementara oleh service worker), lalu menghapusnya. */
export async function takeSharedFile(): Promise<File | null> {
  if (!('caches' in window)) return null;
  const cache = await caches.open(SHARE_CACHE);
  const response = await cache.match(SHARED_FILE_URL);
  if (!response) return null;
  await cache.delete(SHARED_FILE_URL);
  const blob = await response.blob();
  const name = decodeURIComponent(response.headers.get('X-File-Name') ?? 'file-dibagikan');
  return new File([blob], name, { type: blob.type });
}

interface LaunchParams {
  files: { getFile(): Promise<File> }[];
}

/** Desktop: "Buka dengan Nyalin" (File Handling API). */
export function consumeLaunchedFiles(onFile: (file: File) => void) {
  const launchQueue = (window as Window & { launchQueue?: { setConsumer(cb: (p: LaunchParams) => void): void } })
    .launchQueue;
  launchQueue?.setConsumer(async (params) => {
    const handle = params.files?.[0];
    if (handle) onFile(await handle.getFile());
  });
}
