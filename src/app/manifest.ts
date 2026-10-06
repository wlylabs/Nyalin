import type { MetadataRoute } from 'next';

const AUDIO_ACCEPT = ['audio/*', '.opus', '.ogg', '.oga', '.m4a', '.mp3', '.aac', '.wav', '.webm', '.flac'];
const IMAGE_ACCEPT = ['image/jpeg', 'image/png', 'image/webp', '.jpg', '.jpeg', '.png', '.webp'];

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
      'Foto struk atau sebut belanjaan lewat voice note, langsung jadi nota digital: jumlah, nama barang, harga, dan total. Kirim ke WhatsApp, simpan gambar, atau cetak.',
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
        label: 'Pilih foto struk atau voice note',
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
        label: 'Foto struk dan nota berdampingan',
      },
    ],
    shortcuts: [
      {
        name: 'Nota dari foto struk',
        short_name: 'Foto struk',
        url: '/?mode=gambar&source=shortcut',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Nota dari voice note',
        short_name: 'Voice note',
        url: '/?mode=suara&source=shortcut',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Nota manual',
        url: '/?mode=manual&source=shortcut',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Riwayat',
        url: '/riwayat?source=shortcut',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
    // Muncul di menu "Bagikan" Android/ChromeOS: kirim foto atau voice note WhatsApp langsung ke Nyalin.
    share_target: {
      action: '/share-target',
      method: 'post',
      enctype: 'multipart/form-data',
      params: {
        title: 'title',
        text: 'text',
        files: [{ name: 'media', accept: [...IMAGE_ACCEPT, ...AUDIO_ACCEPT] }],
      },
    },
    // Desktop (Chrome/Edge): "Buka dengan Nyalin" untuk file gambar & audio.
    file_handlers: [
      { action: '/', accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] } },
      { action: '/', accept: { 'audio/*': ['.opus', '.ogg', '.m4a', '.mp3', '.wav', '.webm'] } },
    ],
    launch_handler: { client_mode: ['focus-existing', 'auto'] },
  } as MetadataRoute.Manifest;
}
