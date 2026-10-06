/// <reference lib="webworker" />
/**
 * Web Worker untuk Whisper (Transformers.js + ONNX Runtime Web).
 * Pola diadaptasi dari xenova/whisper-web: satu pipeline singleton per model,
 * progres unduhan per file, dan hasil sementara dikirim ke halaman.
 * Bedanya: audio dipotong per segmen ≤ 30 dtk di halaman (di titik sunyi),
 * sehingga progres = segmen selesai / total segmen.
 */
import { env, pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';
import type { FromWorker, ToWorker, WorkerConfig } from './messages';

declare const self: DedicatedWorkerGlobalScope;

const WHISPER_LANGUAGE = { id: 'indonesian', en: 'english', auto: undefined } as const;

let current: { key: string; pipe: Promise<AutomaticSpeechRecognitionPipeline> } | null = null;
const fileProgress = new Map<string, { loaded: number; total: number }>();

function post(message: FromWorker) {
  self.postMessage(message);
}

async function hasWebGPU(): Promise<boolean> {
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    return Boolean(gpu && (await gpu.requestAdapter()));
  } catch {
    return false;
  }
}

async function createPipeline(config: WorkerConfig, id: number) {
  env.allowLocalModels = false;
  if (config.remoteHost) env.remoteHost = config.remoteHost;
  if (env.backends.onnx.wasm) env.backends.onnx.wasm.wasmPaths = config.wasmPath;

  const progress_callback = (info: { status: string; file?: string; loaded?: number; total?: number }) => {
    if (info.status !== 'progress' || !info.file) return;
    fileProgress.set(info.file, { loaded: info.loaded ?? 0, total: info.total ?? 0 });
    let loaded = 0;
    let total = 0;
    fileProgress.forEach((f) => {
      loaded += f.loaded;
      total += f.total;
    });
    post({ type: 'loading', id, loaded, total });
  };

  /**
   * - WebGPU: encoder fp32 + decoder q4 (seperti contoh resmi realtime-whisper-webgpu);
   *   q8 justru lambat di WebGPU. Unduhan ±207 MB untuk whisper-base.
   * - WASM (sebagian besar ponsel): q8 untuk semua bagian, unduhan ±75 MB — jalur cepat di CPU,
   *   sama dengan default xenova/whisper-web.
   */
  const GPU_DTYPE = { encoder_model: 'fp32', decoder_model_merged: 'q4' } as const;
  const load = (device: 'webgpu' | 'wasm') =>
    pipeline('automatic-speech-recognition', config.model, {
      device,
      dtype: device === 'webgpu' ? GPU_DTYPE : 'q8',
      progress_callback,
    });

  if (await hasWebGPU()) {
    try {
      const pipe = await load('webgpu');
      post({ type: 'ready', id, device: 'webgpu' });
      return pipe;
    } catch {
      // WebGPU kadang tersedia tapi tidak stabil di perangkat tertentu → jatuh ke WASM.
      fileProgress.clear();
    }
  }
  const pipe = await load('wasm');
  post({ type: 'ready', id, device: 'wasm' });
  return pipe;
}

function getPipeline(config: WorkerConfig, id: number) {
  const key = `${config.model}|${config.remoteHost ?? ''}`;
  if (!current || current.key !== key) {
    const pipe = createPipeline(config, id);
    current = { key, pipe };
    pipe.catch(() => {
      if (current?.pipe === pipe) current = null; // izinkan coba lagi
    });
  }
  return current.pipe;
}

self.addEventListener('message', async (event: MessageEvent<ToWorker>) => {
  const { id, config, segments, language } = event.data;
  try {
    const transcriber = await getPipeline(config, id);
    const parts: string[] = [];
    for (let i = 0; i < segments.length; i++) {
      const output = await transcriber(segments[i], {
        language: WHISPER_LANGUAGE[language],
        task: 'transcribe',
      });
      const text = (Array.isArray(output) ? output[0]?.text : output.text) ?? '';
      if (text.trim()) parts.push(text.trim());
      post({ type: 'partial', id, text: parts.join(' '), done: i + 1, total: segments.length });
    }
    post({ type: 'complete', id, text: parts.join(' ') });
  } catch (error) {
    post({ type: 'error', id, message: error instanceof Error ? error.message : String(error) });
  }
});
