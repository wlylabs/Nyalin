/** Progres yang dipakai bersama oleh OCR (gambar) dan transkripsi (suara). */
export type ProcessStage = 'preparing' | 'loading-engine' | 'recognizing';

export interface ProcessProgress {
  stage: ProcessStage;
  /** 0–1, atau null jika tahap ini tidak punya progres yang terukur. */
  progress: number | null;
  /** Saat mengunduh model: byte terunduh & total, bila diketahui. */
  loadedBytes?: number;
  totalBytes?: number;
  /** Teks sementara (transkripsi berjalan per segmen). */
  partialText?: string;
}
