import type { TranscribeProvider, TranscribeRequest } from './types';
import { NyalinError, abortError } from '../errors';

/**
 * Provider tiruan untuk demo & QA alur voice note tanpa mengunduh model.
 * Simulasi error lewat nama file: "kosong" (tidak ada ucapan), "gagal", "offline".
 */
const SAMPLES = [
  'Halo, ini aku. Nanti sore jadi ketemu jam empat di kafe dekat kantor ya. Tolong bawa dokumen yang kemarin, sekalian laptopnya. Kalau telat kabari dulu.',
  'Catatan buat besok. Pertama, kirim revisi proposal ke tim desain sebelum jam sepuluh. Kedua, cek ulang anggaran acara. Ketiga, jangan lupa konfirmasi jumlah peserta ke pihak katering.',
  'Bu, tugas kelompoknya dikumpulkan hari Jumat lewat email. Formatnya PDF, maksimal sepuluh halaman, dan di halaman pertama tulis nama semua anggota.',
];

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => (clearTimeout(t), reject(abortError())), { once: true });
  });
}

export function createMockProvider(): TranscribeProvider {
  return {
    id: 'mock',
    processesOnDevice: true,
    needsDecodedAudio: false,
    maxDurationSeconds: 60 * 60,

    async transcribe({ fileName, signal, onProgress, blob }: TranscribeRequest) {
      onProgress({ stage: 'loading-engine', progress: 0, loadedBytes: 0, totalBytes: 0 });
      for (let i = 1; i <= 5; i++) {
        await wait(120, signal);
        onProgress({ stage: 'loading-engine', progress: i / 5, loadedBytes: i * 16e6, totalBytes: 80e6 });
      }
      const name = fileName.toLowerCase();
      if (name.includes('offline')) throw new NyalinError('network');
      if (name.includes('gagal')) throw new NyalinError('process-failed');
      if (name.includes('kosong')) return { text: '' };

      const words = SAMPLES[blob.size % SAMPLES.length].split(' ');
      const steps = 4;
      for (let i = 1; i <= steps; i++) {
        await wait(260, signal);
        onProgress({
          stage: 'recognizing',
          progress: i / steps,
          partialText: words.slice(0, Math.ceil((words.length * i) / steps)).join(' '),
        });
      }
      return { text: words.join(' ') };
    },
  };
}
