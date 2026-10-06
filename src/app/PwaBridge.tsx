'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '../components/Toast';
import { initInstallPrompt } from '../lib/pwa';

/**
 * Menghubungkan fitur PWA dengan aplikasi:
 * - registrasi service worker + tawaran "Muat ulang" saat ada versi baru
 * - shortcut ikon aplikasi (?source=shortcut)
 * - pemberitahuan offline/online
 */
export function PwaBridge() {
  const toast = useToast();
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

  // Shortcut ikon aplikasi membawa ?source=…; rapikan URL-nya.
  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    if (searchParams.get('source')) router.replace(pathname, { scroll: false });
  }, [searchParams, router, pathname]);

  // Status koneksi.
  useEffect(() => {
    const offline = () =>
      toast.show({
        message: 'Kamu sedang offline. Nota tetap bisa dibuat dan tersimpan di perangkat ini.',
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
