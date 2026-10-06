import { isAudioFile, validateAudioFile } from './audio';
import { validateImageFile } from './file';
import type { NyalinErrorCode } from '../services/errors';

export type MediaKind = 'image' | 'audio';

/** Menentukan jenis file dari MIME/ekstensi; gambar diutamakan. */
export function detectMediaKind(file: Pick<File, 'type' | 'name'>): MediaKind {
  if (file.type.startsWith('image/')) return 'image';
  return isAudioFile(file) ? 'audio' : 'image';
}

export function validateMediaFile(
  file: Pick<File, 'type' | 'name' | 'size'>,
  kind: MediaKind = detectMediaKind(file),
): NyalinErrorCode | null {
  return kind === 'audio' ? validateAudioFile(file) : validateImageFile(file);
}
