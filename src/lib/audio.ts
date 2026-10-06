/** Penanganan file audio/voice note: validasi, decode ke format Whisper, dan segmentasi. */

/** Whisper bekerja pada audio mono 16 kHz. */
export const SPEECH_SAMPLE_RATE = 16_000;
export const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25 MB — voice note 1 jam pun jauh di bawah ini
export const MAX_AUDIO_SIZE_LABEL = '25 MB';
/** Batas durasi untuk pemrosesan di perangkat (memori & waktu proses di ponsel). */
export const MAX_AUDIO_DURATION = 15 * 60;
export const MAX_AUDIO_DURATION_LABEL = '15 menit';
/** Batas durasi rekaman langsung. */
export const MAX_RECORDING_SECONDS = 10 * 60;

const AUDIO_EXTENSIONS: Record<string, string> = {
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg', // voice note WhatsApp: Opus di dalam Ogg
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  webm: 'audio/webm',
  flac: 'audio/flac',
};

/** Untuk atribut `accept`. Ekstensi ikut dicantumkan karena beberapa OS tidak mengenali MIME .opus. */
export const AUDIO_ACCEPT_ATTR = ['audio/*', ...Object.keys(AUDIO_EXTENSIONS).map((e) => `.${e}`)].join(',');

/** Format yang dikenal tapi tidak bisa didecode browser, supaya pesan errornya spesifik. */
const KNOWN_UNSUPPORTED_AUDIO = /\.(amr|3gp|wma|caf)$/i;

export function isAudioFile(file: Pick<File, 'type' | 'name'>): boolean {
  if (file.type.startsWith('audio/') || file.type === 'application/ogg') return true;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ext in AUDIO_EXTENSIONS || KNOWN_UNSUPPORTED_AUDIO.test(file.name);
}

export type AudioValidationError = 'unsupported' | 'too-large' | 'empty-file';

export function validateAudioFile(file: Pick<File, 'type' | 'name' | 'size'>): AudioValidationError | null {
  if (!isAudioFile(file) || KNOWN_UNSUPPORTED_AUDIO.test(file.name)) return 'unsupported';
  if (file.size === 0) return 'empty-file';
  if (file.size > MAX_AUDIO_SIZE) return 'too-large';
  return null;
}

/** 83 → "1:23", 3725 → "1:02:05" */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** Versi untuk pembaca layar: "1 menit 23 detik". */
export function formatDurationLong(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec} detik`;
  return sec === 0 ? `${m} menit` : `${m} menit ${sec} detik`;
}

export interface DecodedAudio {
  /** PCM mono 16 kHz. */
  samples: Float32Array;
  duration: number;
}

/**
 * Decode file audio apa pun yang didukung browser lalu ubah ke mono 16 kHz.
 * Decode memakai AudioContext biasa, resample lewat OfflineAudioContext —
 * lebih andal di Safari dibanding AudioContext({ sampleRate: 16000 }).
 */
export async function decodeAudioForSpeech(blob: Blob): Promise<DecodedAudio> {
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const context = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await context.decodeAudioData(await blob.arrayBuffer());
  } finally {
    void context.close().catch(() => {});
  }

  const length = Math.max(1, Math.ceil(decoded.duration * SPEECH_SAMPLE_RATE));
  const offline = new OfflineAudioContext(1, length, SPEECH_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination); // downmix stereo → mono otomatis
  source.start();
  const rendered = await offline.startRendering();
  return { samples: rendered.getChannelData(0), duration: decoded.duration };
}

/** Root-mean-square, untuk mendeteksi audio yang (hampir) hening. */
export function rms(samples: Float32Array, start = 0, end = samples.length): number {
  let sum = 0;
  for (let i = start; i < end; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / Math.max(1, end - start));
}

/** Audio dianggap hening bila tidak ada satu pun bagian 0,5 detik yang cukup keras. */
export function isSilent(samples: Float32Array, sampleRate = SPEECH_SAMPLE_RATE, threshold = 0.008): boolean {
  const frame = Math.floor(sampleRate / 2);
  for (let start = 0; start < samples.length; start += frame) {
    if (rms(samples, start, Math.min(samples.length, start + frame)) > threshold) return false;
  }
  return true;
}

/**
 * Memotong audio panjang menjadi segmen ≤ 30 detik (jendela asli Whisper).
 * Titik potong dicari di bagian paling sunyi menjelang batas, supaya kata tidak terpotong.
 * Hasilnya juga dipakai untuk progres yang jujur: segmen selesai / total segmen.
 */
export function segmentAudio(
  samples: Float32Array,
  sampleRate = SPEECH_SAMPLE_RATE,
  { maxSeconds = 28, searchSeconds = 8, frameSeconds = 0.1 } = {},
): Float32Array[] {
  const maxLen = Math.floor(maxSeconds * sampleRate);
  if (samples.length <= maxLen) return [samples];

  const searchLen = Math.floor(searchSeconds * sampleRate);
  const frameLen = Math.max(1, Math.floor(frameSeconds * sampleRate));
  const segments: Float32Array[] = [];
  let start = 0;

  while (samples.length - start > maxLen) {
    const windowEnd = start + maxLen;
    const windowStart = windowEnd - searchLen;
    let bestCut = windowEnd;
    let bestEnergy = Infinity;
    for (let f = windowStart; f + frameLen <= windowEnd; f += frameLen) {
      const energy = rms(samples, f, f + frameLen);
      if (energy < bestEnergy) {
        bestEnergy = energy;
        bestCut = f + Math.floor(frameLen / 2);
      }
    }
    segments.push(samples.subarray(start, bestCut));
    start = bestCut;
  }
  segments.push(samples.subarray(start));
  return segments;
}
