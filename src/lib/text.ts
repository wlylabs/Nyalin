/** Utilitas teks: hitung kata/karakter dan merapikan hasil OCR. */

export function countWords(text: string): number {
  const matches = text.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}

export function countCharacters(text: string): number {
  // Hitung grapheme, bukan code unit, supaya karakter seperti "é" tetap dihitung satu.
  return Array.from(text).length;
}

const formatter = new Intl.NumberFormat('id-ID');
export const formatNumber = (n: number) => formatter.format(n);

/**
 * Merapikan teks mentah hasil OCR tanpa mengubah isinya:
 * - normalisasi baris baru & spasi
 * - menyambung kata yang terpotong tanda hubung di akhir baris
 * - menyambung baris yang terputus di tengah kalimat
 * - menghapus spasi sebelum tanda baca
 * - membatasi baris kosong berturut-turut
 */
export function tidyOcrText(raw: string): string {
  let text = raw.replace(/\r\n?/g, '\n').replace(/ /g, ' ').replace(/[​﻿]/g, '');

  // Spasi berlebih di dalam baris & di ujung baris.
  text = text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n');

  // "ka-\nta" -> "kata" (hanya jika huruf kecil berlanjut, agar "Jl. A-\nB" aman)
  text = text.replace(/([a-zà-ÿ])-\n([a-zà-ÿ])/g, '$1$2');

  text = joinWrappedLines(text);

  // Tanda baca menempel ke kata sebelumnya.
  text = text.replace(/ +([,.;:!?%)\]])/g, '$1').replace(/([(\[]) +/g, '$1');

  // Maksimal satu baris kosong di antara paragraf.
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

/** Baris sependek ini dianggap sengaja (daftar, judul), bukan baris yang terbungkus. */
const WRAPPED_LINE_MIN = 40;

/**
 * Menyambung baris paragraf yang terpotong karena lebar kertas/foto.
 * Konservatif: hanya bila baris sebelumnya panjang, tidak diakhiri tanda baca penutup,
 * dan baris berikutnya diawali huruf kecil. Daftar pendek seperti "beras / gula" tetap utuh.
 */
function joinWrappedLines(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  for (const line of lines) {
    const prev = out[out.length - 1];
    const canJoin =
      prev !== undefined &&
      prev.length >= WRAPPED_LINE_MIN &&
      !/[.!?:;]$/.test(prev) &&
      /^[a-zà-ÿ]/.test(line);
    if (canJoin) out[out.length - 1] = `${prev} ${line}`;
    else out.push(line);
  }
  return out.join('\n');
}

/** Potongan singkat untuk daftar riwayat. */
export function excerpt(text: string, max = 120): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max).replace(/\s+\S*$/, '')}…`;
}
