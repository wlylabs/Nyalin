import type { NextConfig } from 'next';
import { withSerwist } from '@serwist/turbopack';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Aplikasi nota tidak butuh kamera, mikrofon, maupun lokasi.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      {
        // Service worker harus selalu dicek ulang agar update cepat sampai.
        source: '/serwist/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-cache' }],
      },
    ];
  },
};

export default withSerwist(nextConfig);
