'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '../components/Toast';
import { useNyalin } from '../state/NyalinProvider';
import { consumeLaunchedFiles, initInstallPrompt, takeSharedFile } from '../lib/pwa';

/**
 * Menghubungkan fitur PWA dengan alur aplikasi:
 * - registrasi service worker + tawaran "Muat ulang" saat ada versi baru
 * - file dari menu "Bagikan" (share target) & "Buka dengan" (file handler)
 * - shortcut ikon aplikasi (?mode=gambar|suara|manual)
 * - pemberitahuan offline/online
 */
export function PwaBridge() {
  const toast = useToast();
  const { selectFile, setInputMode, startManual } = useNyalin();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  // Service worker (hanya production; di dev cache justru mengganggu).
  useEffect(() => {
    initInstallPrompt();
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    let cancelled = false;
    void import('@serwist/window').then(({ Serwist }) => {
      if (cancelled) return;
      const sw = new Serwist('/serwist/sw.js', { scope: '/', type: 'module' });
      sw.addEventListener('waiting', () => {
        toast.show({
          message: 'Versi baru Nyalin sudah siap.',
          tone: 'info',
          duration: 30_000,
          action: {
            label: 'Muat ulang',
            onClick: () => {
              sw.addEventListener('controlling', () => window.location.reload());
              sw.messageSkipWaiting();
            },
          },
        });
      });
      void sw.register();
    });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  // File dari luar aplikasi & shortcut.
  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    consumeLaunchedFiles((file) => selectFile(file));

    const shared = searchParams.get('shared');
    const mode = searchParams.get('mode');
    if (mode === 'suara') setInputMode('audio');
    if (mode === 'gambar') setInputMode('image');
    if (mode === 'manual') startManual();
    if (shared === '1') {
      void takeSharedFile().then((file) => {
        if (file) selectFile(file);
        else toast.show({ message: 'File yang dibagikan tidak ditemukan. Coba bagikan lagi.', tone: 'error' });
      });
    } else if (shared === 'failed') {
      toast.show({ message: 'File belum bisa diterima. Buka Nyalin sekali, lalu bagikan lagi.', tone: 'error' });
    }
    if (shared || mode || searchParams.get('source')) router.replace(pathname, { scroll: false });
  }, [searchParams, selectFile, setInputMode, startManual, toast, router, pathname]);

  // Status koneksi.
  useEffect(() => {
    const offline = () =>
      toast.show({
        message: 'Kamu sedang offline. Fitur yang sudah pernah dipakai tetap bisa jalan.',
        tone: 'info',
        duration: 8000,
      });
    const online = () => toast.show({ message: 'Kembali online.', tone: 'success', duration: 3000 });
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    return () => {
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
    };
  }, [toast]);

  return null;
}
