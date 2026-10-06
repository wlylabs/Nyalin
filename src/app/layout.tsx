import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@fontsource-variable/plus-jakarta-sans';
import '../styles/global.css';
import '../styles/motion.css';
import '../views/views.css';
import { AppShell } from './AppShell';

export const metadata: Metadata = {
  title: { default: 'Nyalin — Nota digital', template: '%s · Nyalin' },
  description:
    'Buat nota digital dengan cepat: isi jumlah, nama barang, dan harga — total, tanggal, dan nomor nota terisi otomatis. Kirim ke WhatsApp, simpan sebagai gambar, atau cetak.',
  applicationName: 'Nyalin',
  // iOS: buka dari layar utama tanpa bilah Safari, judul ikon "Nyalin".
  appleWebApp: { capable: true, title: 'Nyalin', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
