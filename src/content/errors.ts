import type { NyalinErrorCode } from '../services/ocr';
import { MAX_FILE_SIZE_LABEL } from '../lib/file';

export interface ErrorCopy {
  title: string;
  description: string;
  tips?: string[];
  /** Apakah memproses ulang gambar yang sama masuk akal. */
  retryable: boolean;
}

export const ERROR_COPY: Record<NyalinErrorCode, ErrorCopy> = {
  unsupported: {
    title: 'Format gambar belum didukung',
    description: 'Nyalin bisa membaca gambar JPG, PNG, dan WEBP.',
    tips: [
      'Foto dari iPhone (HEIC)? Kirim ulang lewat tangkapan layar, atau ubah pengaturan kamera ke "Paling Kompatibel".',
      'File PDF belum bisa dibaca. Ambil tangkapan layar halamannya dulu.',
    ],
    retryable: false,
  },
  'too-large': {
    title: 'Ukuran gambar terlalu besar',
    description: `Ukuran maksimal ${MAX_FILE_SIZE_LABEL}. Coba kecilkan gambar atau ambil tangkapan layar bagian tulisannya saja.`,
    retryable: false,
  },
  'empty-file': {
    title: 'File gambar kosong',
    description: 'File ini tidak berisi gambar. Coba pilih ulang dari galeri.',
    retryable: false,
  },
  unreadable: {
    title: 'Gambar tidak bisa dibuka',
    description: 'File mungkin rusak atau belum selesai terunduh. Coba pilih gambar lain.',
    retryable: false,
  },
  blurry: {
    title: 'Belum bisa membaca tulisan',
    description: 'Tulisan pada gambar terlalu buram atau terlalu kecil untuk dibaca dengan yakin.',
    tips: [
      'Foto dari jarak lebih dekat, tulisan memenuhi layar.',
      'Pastikan cahaya cukup dan tidak ada bayangan menutupi tulisan.',
      'Tahan ponsel sejajar dengan kertas dan tunggu sampai fokus.',
    ],
    retryable: false,
  },
  'empty-result': {
    title: 'Tidak ada tulisan yang ditemukan',
    description: 'Pastikan gambar cukup jelas dan tulisan tidak terlalu kecil.',
    tips: ['Potong gambar agar fokus ke bagian tulisan.', 'Hindari pantulan cahaya pada kertas atau layar.'],
    retryable: false,
  },
  'ocr-failed': {
    title: 'Proses membaca gagal',
    description: 'Ada kendala saat membaca gambar ini. Coba sekali lagi.',
    retryable: true,
  },
  network: {
    title: 'Koneksi bermasalah',
    description:
      'Nyalin perlu koneksi internet untuk menyiapkan pembaca tulisan. Periksa koneksimu, lalu coba lagi.',
    retryable: true,
  },
};
