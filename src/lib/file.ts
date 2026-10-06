/** Penanganan file gambar: validasi, format ukuran, dan penyiapan gambar untuk OCR. */

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ACCEPT_ATTR = ACCEPTED_TYPES.join(',');
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_FILE_SIZE_LABEL = '10 MB';

/** Sisi terpanjang gambar yang dikirim ke OCR. Lebih besar = lebih lambat tanpa hasil yang jauh lebih baik. */
const OCR_MAX_DIMENSION = 2400;

export type FileValidationError = 'unsupported' | 'too-large' | 'empty-file';

const EXTENSION_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** Beberapa browser/OS mengirim `type` kosong; jatuhkan ke ekstensi file. */
export function resolveMimeType(file: Pick<File, 'type' | 'name'>): string {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_TYPES[ext] ?? '';
}

export function validateImageFile(file: Pick<File, 'type' | 'name' | 'size'>): FileValidationError | null {
  const type = resolveMimeType(file);
  if (!(ACCEPTED_TYPES as readonly string[]).includes(type)) return 'unsupported';
  if (file.size === 0) return 'empty-file';
  if (file.size > MAX_FILE_SIZE) return 'too-large';
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb.toLocaleString('id-ID', { maximumFractionDigits: mb < 10 ? 1 : 0 })} MB`;
}

/** Nama file yang lebih ramah untuk foto kamera tanpa nama yang jelas. */
export function displayFileName(name: string): string {
  return name.trim() || 'File tanpa nama';
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('IMAGE_DECODE_FAILED'));
    img.src = src;
  });
}

function drawScaled(img: HTMLImageElement, maxDimension: number): HTMLCanvasElement {
  const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('CANVAS_UNAVAILABLE');
  // Latar putih supaya PNG transparan tetap terbaca.
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Menyiapkan gambar untuk OCR: orientasi EXIF sudah diterapkan oleh browser saat decode,
 * lalu gambar diperkecil bila terlalu besar. Hasilnya canvas di memori — tidak disimpan.
 */
export async function prepareImageForOcr(src: string): Promise<HTMLCanvasElement> {
  const img = await loadImage(src);
  if (!img.naturalWidth || !img.naturalHeight) throw new Error('IMAGE_DECODE_FAILED');
  return drawScaled(img, OCR_MAX_DIMENSION);
}

/** Thumbnail kecil (JPEG) untuk riwayat. Gambar asli tidak pernah disimpan. */
export async function createThumbnail(src: string, maxDimension = 200): Promise<string> {
  const img = await loadImage(src);
  return drawScaled(img, maxDimension).toDataURL('image/jpeg', 0.72);
}
