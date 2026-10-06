/** Protokol pesan antara halaman dan whisper.worker.ts. */
import type { SpeechLanguage } from './types';

export interface WorkerConfig {
  model: string;
  /** URL folder runtime onnxruntime-web (disajikan dari aplikasi sendiri). */
  wasmPath: string;
  /** Host model (default Hugging Face). Bisa diarahkan ke mirror/CDN sendiri. */
  remoteHost?: string;
}

export type ToWorker = {
  type: 'transcribe';
  id: number;
  config: WorkerConfig;
  segments: Float32Array[];
  language: SpeechLanguage;
};

export type FromWorker =
  | { type: 'loading'; id: number; loaded: number; total: number }
  | { type: 'ready'; id: number; device: string }
  | { type: 'partial'; id: number; text: string; done: number; total: number }
  | { type: 'complete'; id: number; text: string }
  | { type: 'error'; id: number; message: string };
