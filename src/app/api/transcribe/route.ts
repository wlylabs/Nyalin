/**
 * Route server untuk transkripsi (dipakai bila NEXT_PUBLIC_TRANSCRIBE_PROVIDER=api).
 * Meneruskan audio ke layanan speech-to-text kompatibel OpenAI; API key tidak pernah sampai ke browser.
 * Audio hanya ada di memori selama request dan tidak disimpan.
 *
 * Env server:
 *   TRANSCRIBE_API_KEY   (wajib)
 *   TRANSCRIBE_API_URL   default https://api.openai.com/v1/audio/transcriptions
 *                        (Groq: https://api.groq.com/openai/v1/audio/transcriptions)
 *   TRANSCRIBE_MODEL     default whisper-1 (Groq: whisper-large-v3)
 *   TRANSCRIBE_RATE_LIMIT  permintaan per IP per jam, default 30
 *
 * Perlindungan biaya: hanya menerima permintaan dari situs ini sendiri (header Origin)
 * dan membatasi jumlah permintaan per IP.
 */
import { MAX_AUDIO_SIZE, validateAudioFile } from '@/lib/audio';
import { clientKey, createRateLimiter } from '@/lib/rateLimit';

export const runtime = 'nodejs';

const rateLimit = createRateLimiter({
  limit: Number(process.env.TRANSCRIBE_RATE_LIMIT) || 30,
  windowMs: 60 * 60 * 1000,
});

/** Tolak permintaan lintas situs (mis. halaman lain yang memakai kuota API kita). */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const LANGUAGE_CODES: Record<string, string | undefined> = { id: 'id', en: 'en', auto: undefined };

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: 'Permintaan tidak diizinkan.' }, { status: 403 });
  }

  const limited = rateLimit(clientKey(request.headers));
  if (!limited.ok) {
    return Response.json(
      { error: 'Terlalu banyak permintaan. Coba lagi nanti.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } },
    );
  }

  const apiKey = process.env.TRANSCRIBE_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'Transkripsi server belum dikonfigurasi.' }, { status: 503 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_AUDIO_SIZE + 64 * 1024) {
    return Response.json({ error: 'File terlalu besar.' }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: 'Format permintaan tidak valid.' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) return Response.json({ error: 'File audio tidak ada.' }, { status: 400 });
  const invalid = validateAudioFile(file);
  if (invalid === 'too-large') return Response.json({ error: 'File terlalu besar.' }, { status: 413 });
  if (invalid) return Response.json({ error: 'Format audio tidak didukung.' }, { status: 415 });

  const upstream = new FormData();
  upstream.append('file', file, file.name || 'voice-note.ogg');
  upstream.append('model', process.env.TRANSCRIBE_MODEL || 'whisper-1');
  upstream.append('response_format', 'json');
  const language = LANGUAGE_CODES[String(form.get('language') ?? 'id')];
  if (language) upstream.append('language', language);

  try {
    const response = await fetch(process.env.TRANSCRIBE_API_URL || 'https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) {
      console.error('[transcribe] upstream error', response.status);
      return Response.json({ error: 'Layanan transkripsi gagal.' }, { status: 502 });
    }
    const json = (await response.json()) as { text?: string };
    return Response.json({ text: json.text ?? '' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[transcribe] request failed', error);
    return Response.json({ error: 'Layanan transkripsi tidak bisa dihubungi.' }, { status: 504 });
  }
}
