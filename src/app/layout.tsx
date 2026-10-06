import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@fontsource-variable/plus-jakarta-sans';
import '../styles/global.css';
import '../views/views.css';
import { AppShell } from './AppShell';

export const metadata: Metadata = {
  title: { default: 'Nyalin — Ubah gambar dan suara jadi tulisan', template: '%s · Nyalin' },
  description:
    'Foto, kirim gambar, atau voice note. Nyalin jadiin tulisan yang bisa kamu edit, salin, dan unduh. Diproses langsung di perangkatmu.',
  applicationName: 'Nyalin',
  manifest: '/manifest.webmanifest',
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
