import type { OcrProvider, OcrProviderResult, OcrRequest, OcrStage } from './types';
import { NyalinError, abortError, looksLikeNetworkError } from '../errors';

type TesseractWorker = import('tesseract.js').Worker;

/** Bahasa Indonesia + Inggris: sebagian besar catatan di Indonesia bercampur istilah Inggris. */
const LANGUAGES = 'ind+eng';

/** Engine & data bahasa disajikan dari aplikasi sendiri (lihat scripts/copy-vendor-assets.mjs). */
function assetUrl(path: string) {
  return new URL(`/vendor/tesseract/${path}`, window.location.href).href;
}

/**
 * OCR di perangkat dengan Tesseract.js (WebAssembly).
 * Gambar tidak dikirim ke mana pun. Yang diunduh hanya engine & data bahasa dari server aplikasi
 * (sekali, lalu data bahasa di-cache di IndexedDB oleh Tesseract).
 */
export function createTesseractProvider(): OcrProvider {
  let workerPromise: Promise<TesseractWorker> | null = null;
  let report: ((stage: OcrStage, progress: number | null) => void) | null = null;

  function getWorker(): Promise<TesseractWorker> {
    if (!workerPromise) {
      workerPromise = import('tesseract.js')
        .then(({ createWorker }) =>
          createWorker(LANGUAGES, 1, {
            workerPath: assetUrl('worker.min.js'),
            corePath: assetUrl('core'),
            langPath: assetUrl('lang'),
            logger: (m) => {
              if (!report) return;
              if (m.status === 'recognizing text') report('recognizing', m.progress);
              else report('loading-engine', typeof m.progress === 'number' ? m.progress : null);
            },
          }),
        )
        .catch((error) => {
          workerPromise = null; // izinkan coba lagi
          throw error;
        });
    }
    return workerPromise;
  }

  async function resetWorker() {
    const pending = workerPromise;
    workerPromise = null;
    try {
      (await pending)?.terminate();
    } catch {
      /* worker sudah mati */
    }
  }

  return {
    id: 'tesseract',
    processesOnDevice: true,

    warmUp() {
      getWorker().catch(() => {
        /* error ditangani saat recognize */
      });
    },

    async recognize({ image, signal, onProgress }: OcrRequest): Promise<OcrProviderResult> {
      if (signal.aborted) throw abortError();
      report = (stage, progress) => onProgress({ stage, progress });
      onProgress({ stage: 'loading-engine', progress: null });

      // Tesseract tidak punya pembatalan per job: hentikan worker (dibuat ulang nanti) dan
      // langsung tolak promise — job yang dihentikan tidak dijamin pernah selesai.
      let onAbort = () => {};
      const aborted = new Promise<never>((_, reject) => {
        onAbort = () => {
          void resetWorker();
          reject(abortError());
        };
      });
      aborted.catch(() => {});
      signal.addEventListener('abort', onAbort, { once: true });

      try {
        const worker = await Promise.race([getWorker(), aborted]);
        if (signal.aborted) throw abortError();
        onProgress({ stage: 'recognizing', progress: 0 });
        const { data } = await Promise.race([worker.recognize(image), aborted]);
        if (signal.aborted) throw abortError();
        return { text: data.text ?? '', confidence: Number.isFinite(data.confidence) ? data.confidence : null };
      } catch (error) {
        if (signal.aborted) throw abortError();
        if (error instanceof NyalinError) throw error;
        throw new NyalinError(looksLikeNetworkError(error) ? 'network' : 'process-failed', error);
      } finally {
        signal.removeEventListener('abort', onAbort);
        report = null;
      }
    },
  };
}
