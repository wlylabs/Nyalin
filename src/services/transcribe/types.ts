import type { ProcessProgress } from '../progress';

/** Bahasa ucapan. "auto" = biarkan model mendeteksi sendiri. */
export type SpeechLanguage = 'id' | 'en' | 'auto';

export interface TranscribeRequest {
  /** File asli (untuk provider server). */
  blob: Blob;
  fileName: string;
  /** PCM mono 16 kHz (untuk provider di perangkat). Null bila provider tidak membutuhkannya. */
  samples: Float32Array | null;
  language: SpeechLanguage;
  signal: AbortSignal;
  onProgress: (progress: ProcessProgress) => void;
}

export interface TranscribeProvider {
  readonly id: string;
  /** true = suara tidak pernah meninggalkan perangkat. */
  readonly processesOnDevice: boolean;
  /** true = butuh audio yang sudah didecode ke PCM 16 kHz. */
  readonly needsDecodedAudio: boolean;
  /** Durasi maksimum (detik) yang bisa ditangani provider. */
  readonly maxDurationSeconds: number;
  transcribe(request: TranscribeRequest): Promise<{ text: string }>;
  warmUp?(): void;
}
