/** Kode error yang dipahami UI. Teksnya ada di `content/errors.ts`. */
export type NyalinErrorCode =
  | 'unsupported'
  | 'too-large'
  | 'empty-file'
  | 'unreadable'
  | 'blurry'
  | 'empty-result'
  | 'ocr-failed'
  | 'network';

export class NyalinError extends Error {
  readonly code: NyalinErrorCode;

  constructor(code: NyalinErrorCode, cause?: unknown) {
    super(code);
    this.name = 'NyalinError';
    this.code = code;
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function abortError(): DOMException {
  return new DOMException('Dibatalkan', 'AbortError');
}

/** Menebak apakah kegagalan disebabkan koneksi, bukan oleh gambarnya. */
export function looksLikeNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const message = String((error as { message?: unknown })?.message ?? error).toLowerCase();
  return /network|fetch|failed to load|load failed|networkerror|timeout|offline|importscripts/.test(message);
}
