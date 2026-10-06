import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@fontsource-variable/plus-jakarta-sans';
import '../styles/global.css';
import '../styles/motion.css';
import '../views/views.css';
import { AppShell } from './AppShell';

export const metadata: Metadata = {
  title: { default: 'Nyalin — Nota digital dari foto struk & voice note', template: '%s · Nyalin' },
  description:
    'Foto struk, catatan belanja, atau sebut belanjaan lewat voice note — Nyalin menyusunnya jadi nota digital berisi jumlah, nama barang, harga, dan total. Kirim ke WhatsApp, simpan sebagai gambar, atau cetak.',
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
