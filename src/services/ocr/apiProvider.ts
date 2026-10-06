import type { OcrProvider, OcrProviderResult, OcrRequest } from './types';
import { NyalinError, abortError, isAbortError } from '../errors';

/**
 * Provider untuk backend OCR sendiri (mis. model tulisan tangan di server).
 * Kontrak: POST multipart/form-data dengan field `image` (JPEG),
 * balasan JSON `{ text: string, confidence?: number }` dengan confidence 0–100.
 * Gambar dikirim saat user menekan "Mulai Nyalin" — copy privasi menyesuaikan otomatis.
 */
export function createApiProvider(endpoint: string): OcrProvider {
  return {
    id: 'api',
    processesOnDevice: false,

    async recognize({ image, signal, onProgress }: OcrRequest): Promise<OcrProviderResult> {
      onProgress({ stage: 'preparing', progress: null });
      const blob = await new Promise<Blob | null>((resolve) => image.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) throw new NyalinError('unreadable');
      if (signal.aborted) throw abortError();

      const body = new FormData();
      body.append('image', blob, 'image.jpg');
      onProgress({ stage: 'recognizing', progress: null });

      let response: Response;
      try {
        response = await fetch(endpoint, { method: 'POST', body, signal });
      } catch (error) {
        if (isAbortError(error)) throw error;
        throw new NyalinError('network', error);
      }

      if (response.status === 413) throw new NyalinError('too-large');
      if (response.status === 415) throw new NyalinError('unsupported');
      if (!response.ok) throw new NyalinError(response.status >= 500 ? 'process-failed' : 'network');

      try {
        const json = (await response.json()) as { text?: unknown; confidence?: unknown };
        return {
          text: typeof json.text === 'string' ? json.text : '',
          confidence: typeof json.confidence === 'number' ? json.confidence : null,
        };
      } catch (error) {
        throw new NyalinError('process-failed', error);
      }
    },
  };
}
