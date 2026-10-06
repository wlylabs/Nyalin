import type { MetadataRoute } from 'next';

/**
 * Web App Manifest — memenuhi kriteria instal Chrome/Edge/Android dan menampilkan
 * dialog instal yang kaya (deskripsi + screenshot). Disajikan di /manifest.webmanifest.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Nyalin — Nota digital',
    short_name: 'Nyalin',
    description:
      'Buat nota digital dengan cepat: isi jumlah, nama barang, dan harga — total, tanggal, dan nomor nota terisi otomatis. Kirim ke WhatsApp, simpan gambar, atau cetak.',
    lang: 'id',
    dir: 'ltr',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'any',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    categories: ['business', 'finance', 'productivity'],
    prefer_related_applications: false,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
    screenshots: [
      {
        src: '/screenshots/beranda-ponsel.png',
        sizes: '780x1688',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Isi nota di ponsel',
      },
      {
        src: '/screenshots/hasil-ponsel.png',
        sizes: '780x1688',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Nota siap dibagikan',
      },
      {
        src: '/screenshots/hasil-desktop.png',
        sizes: '1280x800',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Nota di layar lebar',
      },
    ],
    shortcuts: [
      {
        name: 'Nota baru',
        url: '/?source=shortcut',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Riwayat',
        url: '/riwayat?source=shortcut',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
    launch_handler: { client_mode: ['focus-existing', 'auto'] },
  } as MetadataRoute.Manifest;
}
