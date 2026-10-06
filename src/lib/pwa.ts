'use client';

import { useSyncExternalStore } from 'react';

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
