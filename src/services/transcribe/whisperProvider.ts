import type { TranscribeProvider, TranscribeRequest } from './types';
import type { FromWorker, WorkerConfig } from './messages';
import { NyalinError, abortError, looksLikeNetworkError } from '../errors';
import { MAX_AUDIO_DURATION, SPEECH_SAMPLE_RATE, segmentAudio } from '../../lib/audio';

/**
 * Model multibahasa (termasuk Indonesia). "base" = kompromi akurasi vs ukuran unduhan di ponsel.
 * Ganti lewat NEXT_PUBLIC_WHISPER_MODEL, mis. "onnx-community/whisper-small" untuk akurasi lebih baik.
 */
export const DEFAULT_WHISPER_MODEL = 'onnx-community/whisper-base';

/**
 * Transkripsi di perangkat dengan Whisper (Transformers.js) di Web Worker.
 * Suara tidak dikirim ke mana pun; yang diunduh hanya model (sekali, lalu di-cache browser).
 */
export function createWhisperProvider(): TranscribeProvider {
  let worker: Worker | null = null;
  let nextId = 1;

  function getWorker() {
    if (!worker) {
      worker = new Worker(new URL('./whisper.worker.ts', import.meta.url), { type: 'module' });
    }
    return worker;
  }

  function resetWorker() {
    worker?.terminate();
    worker = null;
  }

  function config(): WorkerConfig {
    return {
      model: process.env.NEXT_PUBLIC_WHISPER_MODEL || DEFAULT_WHISPER_MODEL,
      wasmPath: new URL('/vendor/ort/', window.location.href).href,
      remoteHost: process.env.NEXT_PUBLIC_WHISPER_MODEL_HOST || undefined,
    };
  }

  return {
    id: 'whisper',
    processesOnDevice: true,
    needsDecodedAudio: true,
    maxDurationSeconds: MAX_AUDIO_DURATION,

    transcribe({ samples, language, signal, onProgress }: TranscribeRequest) {
      if (!samples) return Promise.reject(new NyalinError('unreadable'));
      if (signal.aborted) return Promise.reject(abortError());

      const segments = segmentAudio(samples, SPEECH_SAMPLE_RATE);
      const id = nextId++;
      const w = getWorker();
      onProgress({ stage: 'loading-engine', progress: null });

      return new Promise<{ text: string }>((resolve, reject) => {
        const cleanup = () => {
          w.removeEventListener('message', onMessage);
          w.removeEventListener('error', onError);
          signal.removeEventListener('abort', onAbort);
        };
        const onAbort = () => {
          cleanup();
          // Tidak ada pembatalan per job di ONNX Runtime; hentikan worker, nanti dibuat ulang.
          resetWorker();
          reject(abortError());
        };
        const onError = (event: ErrorEvent) => {
          cleanup();
          resetWorker();
          reject(new NyalinError('process-failed', event.message));
        };
        const onMessage = (event: MessageEvent<FromWorker>) => {
          const msg = event.data;
          if (msg.id !== id) return;
          switch (msg.type) {
            case 'loading':
              onProgress({
                stage: 'loading-engine',
                progress: msg.total ? msg.loaded / msg.total : null,
                loadedBytes: msg.loaded,
                totalBytes: msg.total,
              });
              break;
            case 'ready':
              onProgress({ stage: 'recognizing', progress: 0 });
              break;
            case 'partial':
              onProgress({ stage: 'recognizing', progress: msg.done / msg.total, partialText: msg.text });
              break;
            case 'complete':
              cleanup();
              resolve({ text: msg.text });
              break;
            case 'error':
              cleanup();
              reject(new NyalinError(looksLikeNetworkError(msg.message) ? 'network' : 'process-failed', msg.message));
              break;
          }
        };
        w.addEventListener('message', onMessage);
        w.addEventListener('error', onError);
        signal.addEventListener('abort', onAbort, { once: true });
        // Segmen hanya view (subarray); salin agar buffer bisa dipindahkan tanpa menyalin dua kali.
        const copies = segments.map((s) => s.slice());
        w.postMessage({ type: 'transcribe', id, config: config(), segments: copies, language }, copies.map((s) => s.buffer));
      });
    },
  };
}
