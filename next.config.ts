import type { NextConfig } from 'next';
import { withSerwist } from '@serwist/turbopack';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Hanya dipakai di browser; jangan ikut di-trace ke bundle server.
  serverExternalPackages: ['@huggingface/transformers', 'onnxruntime-node', 'sharp'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Kamera lewat <input capture> tidak butuh izin; mikrofon hanya untuk "Rekam suara".
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      {
        // Service worker harus selalu dicek ulang agar update cepat sampai.
        source: '/serwist/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-cache' }],
      },
      {
        // Runtime besar & tidak berubah per versi paket → cache lama.
        source: '/vendor/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }],
      },
    ];
  },
};

export default withSerwist(nextConfig);
