/// <reference lib="webworker" />
/**
 * Service worker Nyalin (Serwist / Workbox).
 * - Precache app shell (halaman, JS, CSS, ikon) → bisa dibuka offline.
 * - Runtime OCR & ONNX (public/vendor) di-cache saat pertama dipakai (cache-first, versi terkunci).
 *   Model Whisper di-cache sendiri oleh Transformers.js (Cache API "transformers-cache").
 * - Share target: menerima gambar/voice note dari menu "Bagikan" di ponsel.
 */
import { defaultCache } from '@serwist/turbopack/worker';
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkOnly,
  Serwist,
  type PrecacheEntry,
  type SerwistGlobalConfig,
} from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/** Harus sama dengan src/lib/pwa.ts */
const SHARE_CACHE = 'nyalin-share';
const SHARE_PATH = '/share-target';
const SHARED_FILE_URL = '/__shared-file';

// Share target didaftarkan sebelum Serwist supaya POST ini ditangani di sini.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'POST' || url.pathname !== SHARE_PATH) return;
  event.respondWith(
    (async () => {
      try {
        const form = await event.request.formData();
        const file = form.getAll('media').find((v): v is File => v instanceof File && v.size > 0);
        const cache = await caches.open(SHARE_CACHE);
        await cache.delete(SHARED_FILE_URL);
        if (file) {
          // File hanya singgah di cache lokal sampai halaman mengambilnya, lalu langsung dihapus.
          await cache.put(
            SHARED_FILE_URL,
            new Response(file, {
              headers: {
                'Content-Type': file.type || 'application/octet-stream',
                'X-File-Name': encodeURIComponent(file.name || 'file-dibagikan'),
              },
            }),
          );
        }
        return Response.redirect(file ? '/?shared=1' : '/', 303);
      } catch {
        return Response.redirect('/', 303);
      }
    })(),
  );
});

/**
 * Bootstrap Web Worker Turbopack membaca konfigurasinya dari fragmen URL (#params=...).
 * Respons dari cache membawa URL tanpa fragmen, sehingga worker (mis. Whisper) gagal start.
 * Solusi: sajikan dari cache sebagai Response baru (tanpa URL), sehingga worker memakai URL
 * permintaan aslinya — lengkap dengan fragmen — dan tetap bisa jalan offline.
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || !/\/_next\/static\/chunks\/turbopack-worker-[^/]+\.js$/.test(url.pathname))
    return;
  event.stopImmediatePropagation();
  event.respondWith(
    (async () => {
      const cached = await caches.match(url.origin + url.pathname, { ignoreSearch: true });
      const source = cached ?? (await fetch(url.origin + url.pathname));
      return new Response(source.body, { status: source.status, headers: source.headers });
    })(),
  );
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // Versi baru menunggu persetujuan user ("Muat ulang") agar proses yang berjalan tidak terputus.
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // File model Whisper (puluhan–ratusan MB) sudah di-cache Transformers.js sendiri;
      // jangan disimpan dua kali oleh service worker.
      matcher: ({ url, sameOrigin }) =>
        !sameOrigin &&
        (/(^|\.)(huggingface\.co|hf\.co)$/.test(url.hostname) || /\/resolve\/|\.onnx(_data)?$/.test(url.pathname)),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/vendor/'),
      handler: new CacheFirst({
        cacheName: 'nyalin-runtime',
        plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 24 * 60 * 60 })],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [{ url: '/offline', matcher: ({ request }) => request.destination === 'document' }],
  },
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

serwist.addEventListeners();
