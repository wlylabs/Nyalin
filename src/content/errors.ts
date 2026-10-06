import type { NyalinErrorCode } from '../services/errors';
import { MAX_FILE_SIZE_LABEL } from '../lib/file';
import { MAX_AUDIO_DURATION_LABEL, MAX_AUDIO_SIZE_LABEL } from '../lib/audio';
import type { MediaKind } from '../lib/media';

export interface ErrorCopy {
  title: string;
  description: string;
  tips?: string[];
  /** Apakah memproses ulang file yang sama masuk akal. */
  retryable: boolean;
}

/** Error mikrofon hanya muncul di alur suara. */
const IMAGE: Record<Exclude<NyalinErrorCode, 'mic-denied' | 'mic-unavailable'>, ErrorCopy> = {
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
  'too-long': {
    title: 'Gambar terlalu besar untuk diproses',
    description: 'Coba potong gambar agar fokus ke bagian tulisan.',
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
  'process-failed': {
    title: 'Proses membaca gagal',
    description: 'Ada kendala saat membaca gambar ini. Coba sekali lagi.',
    retryable: true,
  },
  network: {
    title: 'Koneksi bermasalah',
    description: 'Nyalin perlu koneksi internet untuk menyiapkan pembaca tulisan. Periksa koneksimu, lalu coba lagi.',
    retryable: true,
  },
};

const AUDIO: Record<NyalinErrorCode, ErrorCopy> = {
  unsupported: {
    title: 'Format audio belum didukung',
    description: 'Nyalin bisa membaca voice note WhatsApp (.opus/.ogg), MP3, M4A, AAC, WAV, dan WEBM.',
    tips: ['Rekaman .amr atau .3gp? Simpan ulang sebagai MP3 atau M4A dari aplikasi perekammu.'],
    retryable: false,
  },
  'too-large': {
    title: 'Ukuran audio terlalu besar',
    description: `Ukuran maksimal ${MAX_AUDIO_SIZE_LABEL}. Potong audio jadi beberapa bagian, lalu nyalin satu per satu.`,
    retryable: false,
  },
  'too-long': {
    title: 'Voice note terlalu panjang',
    description: `Untuk diproses di perangkat, durasi maksimal ${MAX_AUDIO_DURATION_LABEL}. Potong audio jadi beberapa bagian.`,
    retryable: false,
  },
  'empty-file': {
    title: 'File audio kosong',
    description: 'File ini tidak berisi suara. Coba pilih ulang atau rekam lagi.',
    retryable: false,
  },
  unreadable: {
    title: 'Audio tidak bisa diputar',
    description: 'Browser ini belum bisa membuka file tersebut, atau file-nya rusak.',
    tips: [
      'Voice note WhatsApp di iPhone butuh iOS 18.4 atau lebih baru. Bisa juga dibuka dari Chrome di komputer.',
      'Atau simpan ulang audio sebagai MP3/M4A.',
    ],
    retryable: false,
  },
  blurry: {
    title: 'Suaranya kurang jelas',
    description: 'Sebagian besar ucapan tidak bisa dikenali dengan yakin.',
    retryable: false,
  },
  'empty-result': {
    title: 'Tidak ada ucapan yang terdengar',
    description: 'Audio ini hening atau suaranya terlalu pelan.',
    tips: [
      'Rekam lebih dekat ke mikrofon, di tempat yang tidak bising.',
      'Pastikan mikrofon tidak tertutup jari atau casing.',
    ],
    retryable: false,
  },
  'process-failed': {
    title: 'Proses mendengarkan gagal',
    description: 'Ada kendala saat mengubah suara jadi tulisan. Coba sekali lagi.',
    tips: ['Tutup tab lain yang berat bila memori perangkat terbatas.'],
    retryable: true,
  },
  network: {
    title: 'Koneksi bermasalah',
    description:
      'Pemakaian pertama perlu koneksi internet untuk mengunduh model pengenal suara. Periksa koneksimu, lalu coba lagi.',
    retryable: true,
  },
  'mic-denied': {
    title: 'Izin mikrofon ditolak',
    description: 'Nyalin butuh mikrofon hanya selama kamu merekam. Rekaman tidak dikirim ke mana pun.',
    tips: [
      'Ketuk ikon gembok di sebelah alamat situs, lalu izinkan Mikrofon.',
      'Atau upload voice note yang sudah ada.',
    ],
    retryable: false,
  },
  'mic-unavailable': {
    title: 'Mikrofon tidak ditemukan',
    description: 'Perangkat ini tidak punya mikrofon yang bisa dipakai, atau sedang dipakai aplikasi lain.',
    tips: ['Tutup aplikasi lain yang memakai mikrofon (telepon, rapat online), lalu coba lagi.'],
    retryable: false,
  },
};

export function getErrorCopy(code: NyalinErrorCode, kind: MediaKind): ErrorCopy {
  if (kind === 'image' && code !== 'mic-denied' && code !== 'mic-unavailable') return IMAGE[code];
  return AUDIO[code];
}
