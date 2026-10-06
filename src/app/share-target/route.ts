/**
 * Cadangan bila share target terpanggil tanpa service worker aktif (mis. baru di-update).
 * Service worker biasanya menangani POST ini lebih dulu (lihat src/sw/sw.ts).
 */
export function POST(request: Request) {
  return Response.redirect(new URL('/?shared=failed', request.url), 303);
}

export function GET(request: Request) {
  return Response.redirect(new URL('/', request.url), 303);
}
