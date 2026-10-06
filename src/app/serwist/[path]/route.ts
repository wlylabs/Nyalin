/**
 * Menyajikan service worker di /serwist/sw.js (cara Serwist untuk Next.js + Turbopack:
 * di-bundle esbuild saat build lalu disajikan statis).
 */
import { createSerwistRoute } from '@serwist/turbopack';

const revision = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.BUILD_ID ?? `${Date.now()}`;

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: 'src/sw/sw.ts',
  useNativeEsbuild: true,
  // Screenshot hanya untuk dialog instal, tidak perlu disimpan offline.
  globIgnores: ['public/screenshots/**'],
  additionalPrecacheEntries: [
    { url: '/', revision },
    { url: '/riwayat', revision },
    { url: '/offline', revision },
  ],
});
