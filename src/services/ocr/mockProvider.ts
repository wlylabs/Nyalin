import type { OcrProvider, OcrProviderResult, OcrRequest } from './types';
import { NyalinError, abortError } from '../errors';

/**
 * Provider tiruan untuk demo & pengujian alur tanpa engine OCR.
 * Hasilnya dipilih dari beberapa contoh realistis berdasarkan ukuran gambar.
 *
 * Simulasi error lewat nama file (untuk QA):
 *   "buram"   → tulisan terlalu buram
 *   "kosong"  → tidak ada tulisan
 *   "gagal"   → OCR gagal
 *   "offline" → koneksi bermasalah
 */
const SAMPLES: OcrProviderResult[] = [
  {
    confidence: 91,
    text: `Catatan Rapat Mingguan
Senin, 14 Oktober

1. Evaluasi jadwal piket kebersihan kelas.
2. Persiapan lomba 17-an: tim dekorasi dan konsumsi dibagi minggu ini.
3. Kas kelas dibayar paling lambat hari Jumat.

Tindak lanjut:
- Rina membuat daftar kebutuhan dekorasi.
- Bayu mengecek ketersediaan aula.`,
  },
  {
    confidence: 84,
    text: `Belanja minggu ini
beras 5 kg
minyak goreng 2 liter
telur 1 kg
bawang merah & bawang putih
gula pasir
sabun cuci piring
kopi bubuk`,
  },
  {
    confidence: 88,
    text: `Resep Sambal Matah

Bahan:
- 10 bawang merah, iris tipis
- 5 cabai rawit, iris
- 2 batang serai, ambil bagian putihnya
- 1 buah jeruk limau
- garam secukupnya
- 4 sdm minyak kelapa panas

Cara membuat:
Campur semua bahan dalam mangkuk, siram dengan minyak kelapa panas, lalu aduk rata. Tambahkan perasan jeruk limau sesaat sebelum disajikan.`,
  },
  {
    confidence: 63,
    text: `Ringkasan Bab 3 - Ekosistem
Ekosistem adalah hubungan timbal balik antara makhluk hidup dengan lingkungannya.
Komponen biotik: produsen, konsumen, dan pengurai.
Komponen abiotik: air, tanah, udara, cahaya matahari, suhu.
Rantai makanan: rumput -> belalang -> katak -> ular -> elang.`,
  },
];

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(abortError());
      },
      { once: true },
    );
  });
}

export function createMockProvider(): OcrProvider {
  return {
    id: 'mock',
    processesOnDevice: true,

    async recognize({ image, signal, onProgress, fileName }: OcrRequest): Promise<OcrProviderResult> {
      onProgress({ stage: 'loading-engine', progress: null });
      await wait(450, signal);

      const steps = 12;
      for (let i = 1; i <= steps; i++) {
        await wait(110, signal);
        onProgress({ stage: 'recognizing', progress: i / steps });
      }

      const name = fileName.toLowerCase();
      if (name.includes('offline')) throw new NyalinError('network');
      if (name.includes('gagal')) throw new NyalinError('process-failed');
      if (name.includes('kosong')) return { text: '   \n', confidence: 0 };
      if (name.includes('buram')) return { text: 'Rn  ka.. ,e  lt', confidence: 18 };

      const index = (image.width * 31 + image.height * 17) % SAMPLES.length;
      return SAMPLES[index];
    },
  };
}
