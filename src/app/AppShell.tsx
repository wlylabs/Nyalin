'use client';

import { Suspense, useCallback, useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Navbar } from '../components/Navbar';
import { FilePickerProvider, useFilePicker } from '../components/FilePicker';
import { ToastProvider } from '../components/Toast';
import { NyalinProvider, useNyalin } from '../state/NyalinProvider';
import { PwaBridge } from './PwaBridge';

/** Provider client & kerangka halaman. State alur hidup di sini agar bertahan antar halaman. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <NyalinProvider>
        <FileRouting>
          <Shell>{children}</Shell>
          <Suspense fallback={null}>
            <PwaBridge />
          </Suspense>
        </FileRouting>
      </NyalinProvider>
    </ToastProvider>
  );
}

/** File yang dipilih dari halaman mana pun membawa user kembali ke alur utama. */
function FileRouting({ children }: { children: ReactNode }) {
  const { selectFile } = useNyalin();
  const router = useRouter();
  const pathname = usePathname();
  const handleFile = useCallback(
    (file: File) => {
      selectFile(file);
      if (pathname !== '/') router.push('/');
    },
    [selectFile, router, pathname],
  );
  return <FilePickerProvider onFile={handleFile}>{children}</FilePickerProvider>;
}

function Shell({ children }: { children: ReactNode }) {
  const nyalin = useNyalin();
  const { openFiles } = useFilePicker();
  const router = useRouter();
  const pathname = usePathname();
  const { selectFile, reset, inputMode } = nyalin;

  // Tempel gambar langsung dari clipboard (Ctrl+V) di desktop.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest('textarea, input, select, [contenteditable="true"]')) return;
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'));
      if (!file) return;
      e.preventDefault();
      selectFile(file);
      if (pathname !== '/') router.push('/');
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [selectFile, router, pathname]);

  // Mulai ulang: kembali ke awal dan langsung buka pemilih file sesuai mode.
  const startFresh = useCallback(() => {
    reset();
    if (pathname !== '/') router.push('/');
    openFiles(inputMode);
  }, [reset, router, pathname, openFiles, inputMode]);

  return (
    <>
      <a className="skip-link" href="#main">
        Langsung ke konten
      </a>
      <Navbar onStart={startFresh} historyActive={pathname === '/riwayat'} />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
    </>
  );
}
