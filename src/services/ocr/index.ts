import type { OcrProgress, OcrProvider } from './types';
import { NyalinError, isAbortError } from '../errors';
import { createTesseractProvider } from './tesseractProvider';
import { createMockProvider } from './mockProvider';
import { createApiProvider } from './apiProvider';
import { prepareImageForOcr } from '../../lib/file';
import { tidyOcrText } from '../../lib/text';

export type { OcrProgress, OcrProvider, OcrStage } from './types';

/** Di bawah ambang ini hasil dianggap tidak bisa dipakai (gambar terlalu buram). */
export const UNUSABLE_CONFIDENCE = 35;
/** Di bawah ambang ini hasil tetap ditampilkan, tapi user diminta mengecek ulang. */
export const LOW_CONFIDENCE = 70;

/**
 * Memilih provider dari konfigurasi build (`NEXT_PUBLIC_OCR_PROVIDER`).
 * Untuk demo, `?ocr=mock` di URL juga bisa dipakai.
 */
function selectProvider(): OcrProvider {
  const fromQuery = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('ocr') : null;
  const id = (fromQuery ?? process.env.NEXT_PUBLIC_OCR_PROVIDER ?? 'tesseract').toLowerCase();

  if (id === 'mock') return createMockProvider();
  if (id === 'api') {
    const endpoint = process.env.NEXT_PUBLIC_OCR_API_URL;
    if (endpoint) return createApiProvider(endpoint);
    console.warn('[Nyalin] NEXT_PUBLIC_OCR_API_URL belum diisi, kembali ke OCR di perangkat.');
  }
  return createTesseractProvider();
}

export const ocrProvider: OcrProvider = selectProvider();

/** Error "buram" yang tetap membawa teks, supaya user bisa memilih melihat hasil apa adanya. */
export class BlurryResultError extends NyalinError {
  readonly text: string;
  readonly confidence: number;

  constructor(text: string, confidence: number) {
    super('blurry');
    this.text = text;
    this.confidence = confidence;
  }
}

export interface OcrOutcome {
  text: string;
  confidence: number | null;
  /** Hasil ada, tapi sebaiknya diperiksa ulang. */
  lowConfidence: boolean;
}

export interface RunOcrOptions {
  imageUrl: string;
  fileName: string;
  signal: AbortSignal;
  onProgress: (progress: OcrProgress) => void;
}

/**
 * Pipeline lengkap: siapkan gambar → OCR → rapikan teks → nilai kualitas.
 * Melempar `NyalinError` dengan kode yang bisa langsung ditampilkan UI.
 */
export async function runOcr({ imageUrl, fileName, signal, onProgress }: RunOcrOptions): Promise<OcrOutcome> {
  onProgress({ stage: 'preparing', progress: null });

  let image: HTMLCanvasElement;
  try {
    image = await prepareImageForOcr(imageUrl);
  } catch (error) {
    throw new NyalinError('unreadable', error);
  }

  let raw;
  try {
    raw = await ocrProvider.recognize({ image, signal, onProgress, fileName });
  } catch (error) {
    if (isAbortError(error) || error instanceof NyalinError) throw error;
    throw new NyalinError('process-failed', error);
  }

  const text = tidyOcrText(raw.text);
  const hasLetters = /[\p{L}\p{N}]/u.test(text);
  if (!hasLetters) throw new NyalinError('empty-result');

  const confidence = raw.confidence;
  if (confidence !== null && confidence < UNUSABLE_CONFIDENCE) {
    throw new BlurryResultError(text, confidence);
  }

  return { text, confidence, lowConfidence: confidence !== null && confidence < LOW_CONFIDENCE };
}
