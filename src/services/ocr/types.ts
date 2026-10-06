/**
 * Kontrak provider OCR. Semua provider (on-device, mock, API server) memenuhi interface ini,
 * sehingga provider bisa diganti tanpa menyentuh UI atau state.
 */

import type { ProcessProgress, ProcessStage } from '../progress';

export type OcrStage = ProcessStage;
export type OcrProgress = ProcessProgress;

export interface OcrRequest {
  /** Gambar yang sudah disiapkan (orientasi benar, ukuran wajar). */
  image: HTMLCanvasElement;
  signal: AbortSignal;
  onProgress: (progress: OcrProgress) => void;
  /** Nama file asal — hanya untuk provider yang membutuhkan (mis. mock untuk simulasi). */
  fileName: string;
}

export interface OcrProviderResult {
  text: string;
  /** Rata-rata keyakinan 0–100, atau null bila provider tidak menyediakannya. */
  confidence: number | null;
}

export interface OcrProvider {
  readonly id: string;
  /** true = gambar tidak pernah meninggalkan perangkat. Dipakai untuk copy privasi. */
  readonly processesOnDevice: boolean;
  recognize(request: OcrRequest): Promise<OcrProviderResult>;
  /** Opsional: mulai memuat engine lebih awal agar proses terasa cepat. */
  warmUp?(): void;
}
