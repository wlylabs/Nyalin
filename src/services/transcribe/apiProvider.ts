import type { TranscribeProvider, TranscribeRequest } from './types';
import { NyalinError, abortError, isAbortError } from '../errors';

/**
 * Transkripsi lewat route server Nyalin (/api/transcribe), yang meneruskan ke layanan
 * speech-to-text kompatibel OpenAI (OpenAI, Groq, dsb). API key tetap di server.
 * Suara dikirim hanya saat user menekan "Mulai Nyalin" dan tidak disimpan.
 */
export function createApiProvider(endpoint = '/api/transcribe'): TranscribeProvider {
  return {
    id: 'api',
    processesOnDevice: false,
    needsDecodedAudio: false,
    maxDurationSeconds: 60 * 60,

    async transcribe({ blob, fileName, language, signal, onProgress }: TranscribeRequest) {
      if (signal.aborted) throw abortError();
      const body = new FormData();
      body.append('file', blob, fileName || 'voice-note');
      body.append('language', language);
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
      if (response.status === 429) throw new NyalinError('rate-limited');
      if (!response.ok) throw new NyalinError(response.status >= 500 ? 'process-failed' : 'network');
      const json = (await response.json().catch(() => ({}))) as { text?: unknown };
      return { text: typeof json.text === 'string' ? json.text : '' };
    },
  };
}
