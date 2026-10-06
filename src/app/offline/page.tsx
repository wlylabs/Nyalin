import type { Metadata } from 'next';
import Link from 'next/link';
import { WifiOff } from 'lucide-react';

export const metadata: Metadata = { title: 'Offline', robots: { index: false } };

/** Ditampilkan service worker bila halaman yang diminta belum tersimpan dan perangkat offline. */
export default function OfflinePage() {
  return (
    <div className="page page--narrow stack">
      <span className="error-state__icon" aria-hidden="true">
        <WifiOff />
      </span>
      <h1 className="view-title">Kamu sedang offline</h1>
      <p className="view-subtitle">
        Halaman ini belum tersimpan di perangkat. Beranda dan Riwayat tetap bisa dibuka tanpa internet.
      </p>
      <p>
        <Link href="/">Kembali ke beranda</Link>
      </p>
    </div>
  );
}
