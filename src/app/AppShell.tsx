'use client';

import { Suspense, useCallback, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Navbar } from '../components/Navbar';
import { ToastProvider } from '../components/Toast';
import { NotaProvider, useNota } from '../state/NotaProvider';
import { PwaBridge } from './PwaBridge';

/** Provider client & kerangka halaman. Nota yang sedang dibuka hidup di sini agar bertahan antar halaman. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <NotaProvider>
        <Shell>{children}</Shell>
        <Suspense fallback={null}>
          <PwaBridge />
        </Suspense>
      </NotaProvider>
    </ToastProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { startNew } = useNota();
  const router = useRouter();
  const pathname = usePathname();

  /** "Nota baru": nota kosong dengan nomor berikutnya. */
  const startFresh = useCallback(() => {
    startNew();
    if (pathname !== '/') router.push('/');
  }, [startNew, router, pathname]);

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
