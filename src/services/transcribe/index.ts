import type { TranscribeProvider, SpeechLanguage } from './types';
import type { ProcessProgress } from '../progress';
import { NyalinError, isAbortError } from '../errors';
import { createWhisperProvider } from './whisperProvider';
import { createApiProvider } from './apiProvider';
import { createMockProvider } from './mockProvider';
import { decodeAudioForSpeech, isSilent } from '../../lib/audio';
import { tidyTranscript } from '../../lib/text';

export type { SpeechLanguage, TranscribeProvider } from './types';

/**
 * Provider dipilih dari `NEXT_PUBLIC_TRANSCRIBE_PROVIDER`: whisper (default, di perangkat) | api | mock.
 * Untuk demo, `?stt=mock` di URL juga bisa dipakai.
 */
function selectProvider(): TranscribeProvider {
  const fromQuery = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('stt') : null;
  const id = (fromQuery ?? process.env.NEXT_PUBLIC_TRANSCRIBE_PROVIDER ?? 'whisper').toLowerCase();
  if (id === 'mock') return createMockProvider();
  if (id === 'api') return createApiProvider();
  return createWhisperProvider();
}

export const transcribeProvider: TranscribeProvider = selectProvider();

export interface RunTranscriptionOptions {
  audioUrl: string;
  fileName: string;
  language: SpeechLanguage;
  signal: AbortSignal;
  onProgress: (progress: ProcessProgress) => void;
}

/** Pipeline lengkap: ambil audio → decode (bila perlu) → cek durasi & hening → transkripsi → rapikan. */
export async function runTranscription({ audioUrl, fileName, language, signal, onProgress }: RunTranscriptionOptions) {
  onProgress({ stage: 'preparing', progress: null });
  const blob = await fetch(audioUrl).then((r) => r.blob());

  let samples: Float32Array | null = null;
  let duration: number | null = null;
  if (transcribeProvider.needsDecodedAudio) {
    try {
      ({ samples, duration } = await decodeAudioForSpeech(blob));
    } catch (error) {
      throw new NyalinError('unreadable', error);
    }
    if (duration > transcribeProvider.maxDurationSeconds) throw new NyalinError('too-long');
    if (isSilent(samples)) throw new NyalinError('empty-result');
  }

  let raw: { text: string };
  try {
    raw = await transcribeProvider.transcribe({ blob, fileName, samples, language, signal, onProgress });
  } catch (error) {
    if (isAbortError(error) || error instanceof NyalinError) throw error;
    throw new NyalinError('process-failed', error);
  }

  const text = tidyTranscript(raw.text);
  if (!/[\p{L}\p{N}]/u.test(text)) throw new NyalinError('empty-result');
  return { text, duration };
}
