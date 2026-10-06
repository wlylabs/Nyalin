/**
 * Rate limiter sliding-window sederhana di memori.
 * Cukup untuk satu instance server (mis. `next start`, container). Di serverless dengan banyak
 * instance, batasnya berlaku per instance — pakai store bersama (Redis/Upstash) bila perlu ketat.
 */
export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Detik sampai permintaan berikutnya diizinkan (0 bila ok). */
  retryAfter: number;
}

export function createRateLimiter({
  limit,
  windowMs,
  maxKeys = 10_000,
}: {
  limit: number;
  windowMs: number;
  maxKeys?: number;
}) {
  const hits = new Map<string, number[]>();

  return function check(key: string, now = Date.now()): RateLimitResult {
    const windowStart = now - windowMs;
    const recent = (hits.get(key) ?? []).filter((t) => t > windowStart);

    if (recent.length >= limit) {
      hits.set(key, recent);
      return { ok: false, remaining: 0, retryAfter: Math.ceil((recent[0] + windowMs - now) / 1000) };
    }

    recent.push(now);
    // Map mempertahankan urutan sisip: hapus kunci tertua agar memori tidak tumbuh tanpa batas.
    hits.delete(key);
    hits.set(key, recent);
    if (hits.size > maxKeys) hits.delete(hits.keys().next().value as string);
    return { ok: true, remaining: limit - recent.length, retryAfter: 0 };
  };
}

/** IP klien dari header proxy umum; jatuh ke "unknown" (semua tanpa IP berbagi satu kuota). */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || headers.get('x-real-ip') || 'unknown';
}
