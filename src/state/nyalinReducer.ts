import type { NyalinErrorCode } from '../services/errors';
import type { ProcessProgress } from '../services/progress';
import type { MediaKind } from '../lib/media';
import type { SpeechLanguage } from '../services/transcribe/types';
import type { Receipt } from '../lib/receipt';

export interface SelectedMedia {
  kind: MediaKind;
  /** Object URL (file baru), data URL thumbnail (gambar dari riwayat), atau "" (suara dari riwayat). */
  url: string;
  name: string;
  size: number | null;
  /** Durasi audio dalam detik, bila diketahui. */
  duration: number | null;
  /** true bila dibuka dari riwayat — file aslinya tidak tersimpan, jadi tidak bisa diproses ulang. */
  fromHistory: boolean;
}

export interface ResultData {
  text: string;
  lowConfidence: boolean;
  historyId: string | null;
  /** Nota digital yang dibaca dari teks hasil. */
  receipt?: Receipt | null;
  /** Kunci tampilan yang stabil (nota manual belum punya URL media maupun id riwayat). */
  key?: string;
}

export type NyalinState =
  | { phase: 'empty'; selectionError: NyalinErrorCode | null }
  | { phase: 'selected'; media: SelectedMedia; language: SpeechLanguage; selectionError: NyalinErrorCode | null }
  | { phase: 'processing'; media: SelectedMedia; language: SpeechLanguage; progress: ProcessProgress }
  /** media null = nota manual (dibuat tanpa foto/suara). */
  | { phase: 'result'; media: SelectedMedia | null; result: ResultData }
  | {
      phase: 'error';
      media: SelectedMedia | null;
      language: SpeechLanguage;
      code: NyalinErrorCode;
      partialText: string | null;
    };

export type NyalinAction =
  | { type: 'select'; media: SelectedMedia }
  | { type: 'selection-error'; code: NyalinErrorCode }
  | { type: 'set-language'; language: SpeechLanguage }
  | { type: 'set-duration'; url: string; duration: number }
  | { type: 'start' }
  | { type: 'progress'; progress: ProcessProgress }
  | { type: 'success'; result: ResultData }
  | { type: 'fail'; code: NyalinErrorCode; partialText?: string | null }
  | { type: 'cancel' }
  | { type: 'show-partial'; historyId: string | null; receipt: Receipt }
  | { type: 'edit-receipt'; receipt: Receipt | null }
  | { type: 'attach-history'; historyId: string }
  | { type: 'open'; media: SelectedMedia | null; result: ResultData }
  | { type: 'reset' };

export const initialState: NyalinState = { phase: 'empty', selectionError: null };

/** Bahasa ucapan default: sebagian besar voice note pengguna Indonesia. */
export const DEFAULT_LANGUAGE: SpeechLanguage = 'id';

export function nyalinReducer(state: NyalinState, action: NyalinAction): NyalinState {
  switch (action.type) {
    case 'select':
      return {
        phase: 'selected',
        media: action.media,
        language: 'language' in state ? state.language : DEFAULT_LANGUAGE,
        selectionError: null,
      };

    case 'selection-error':
      // Tetap di layar saat ini supaya user tidak kehilangan file yang sudah dipilih.
      if (state.phase === 'selected') return { ...state, selectionError: action.code };
      return { phase: 'empty', selectionError: action.code };

    case 'set-language':
      if (state.phase !== 'selected') return state;
      return { ...state, language: action.language };

    case 'set-duration':
      // Durasi diketahui belakangan (metadata/decode); abaikan bila file sudah diganti.
      if (!('media' in state) || !state.media || state.media.url !== action.url) return state;
      return { ...state, media: { ...state.media, duration: action.duration } } as NyalinState;

    case 'start':
      if (state.phase !== 'selected' && state.phase !== 'error') return state;
      if (!state.media || state.media.fromHistory) return state;
      return {
        phase: 'processing',
        media: state.media,
        language: state.language,
        progress: { stage: 'preparing', progress: null },
      };

    case 'progress':
      if (state.phase !== 'processing') return state;
      return { ...state, progress: action.progress };

    case 'success':
      if (state.phase !== 'processing') return state;
      return { phase: 'result', media: state.media, result: action.result };

    case 'fail':
      if (state.phase !== 'processing') return state;
      return {
        phase: 'error',
        media: state.media,
        language: state.language,
        code: action.code,
        partialText: action.partialText ?? null,
      };

    case 'cancel':
      if (state.phase !== 'processing') return state;
      return { phase: 'selected', media: state.media, language: state.language, selectionError: null };

    case 'show-partial':
      if (state.phase !== 'error' || !state.media) return state;
      return {
        phase: 'result',
        media: state.media,
        result: {
          text: state.partialText ?? '',
          lowConfidence: Boolean(state.partialText),
          historyId: action.historyId,
          receipt: action.receipt,
        },
      };

    case 'edit-receipt':
      if (state.phase !== 'result') return state;
      return { ...state, result: { ...state.result, receipt: action.receipt } };

    case 'attach-history':
      if (state.phase !== 'result') return state;
      return { ...state, result: { ...state.result, historyId: action.historyId } };

    case 'open':
      return { phase: 'result', media: action.media, result: action.result };

    case 'reset':
      return initialState;
  }
}
