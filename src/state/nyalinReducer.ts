import type { NyalinErrorCode, OcrProgress } from '../services/ocr';

export interface SelectedImage {
  /** Object URL (gambar baru) atau data URL thumbnail (dibuka dari riwayat). */
  url: string;
  name: string;
  size: number | null;
  /** true bila gambar hanya thumbnail dari riwayat. */
  fromHistory: boolean;
}

export interface ResultData {
  text: string;
  lowConfidence: boolean;
  historyId: string | null;
}

export type NyalinState =
  | { phase: 'empty'; selectionError: NyalinErrorCode | null }
  | { phase: 'selected'; image: SelectedImage; selectionError: NyalinErrorCode | null }
  | { phase: 'processing'; image: SelectedImage; progress: OcrProgress }
  | { phase: 'result'; image: SelectedImage; result: ResultData }
  | { phase: 'error'; image: SelectedImage | null; code: NyalinErrorCode; partialText: string | null };

export type NyalinAction =
  | { type: 'select'; image: SelectedImage }
  | { type: 'selection-error'; code: NyalinErrorCode }
  | { type: 'start' }
  | { type: 'progress'; progress: OcrProgress }
  | { type: 'success'; result: ResultData }
  | { type: 'fail'; code: NyalinErrorCode; partialText?: string | null }
  | { type: 'cancel' }
  | { type: 'show-partial'; historyId: string | null }
  | { type: 'edit'; text: string }
  | { type: 'attach-history'; historyId: string }
  | { type: 'open'; image: SelectedImage; result: ResultData }
  | { type: 'reset' };

export const initialState: NyalinState = { phase: 'empty', selectionError: null };

export function nyalinReducer(state: NyalinState, action: NyalinAction): NyalinState {
  switch (action.type) {
    case 'select':
      return { phase: 'selected', image: action.image, selectionError: null };

    case 'selection-error':
      // Tetap di layar saat ini supaya user tidak kehilangan gambar yang sudah dipilih.
      if (state.phase === 'selected') return { ...state, selectionError: action.code };
      return { phase: 'empty', selectionError: action.code };

    case 'start':
      if (state.phase !== 'selected' && state.phase !== 'error') return state;
      if (!state.image || state.image.fromHistory) return state;
      return { phase: 'processing', image: state.image, progress: { stage: 'preparing', progress: null } };

    case 'progress':
      if (state.phase !== 'processing') return state;
      return { ...state, progress: action.progress };

    case 'success':
      if (state.phase !== 'processing') return state;
      return { phase: 'result', image: state.image, result: action.result };

    case 'fail':
      if (state.phase !== 'processing') return state;
      return { phase: 'error', image: state.image, code: action.code, partialText: action.partialText ?? null };

    case 'cancel':
      if (state.phase !== 'processing') return state;
      return { phase: 'selected', image: state.image, selectionError: null };

    case 'show-partial':
      if (state.phase !== 'error' || !state.image) return state;
      return {
        phase: 'result',
        image: state.image,
        result: { text: state.partialText ?? '', lowConfidence: Boolean(state.partialText), historyId: action.historyId },
      };

    case 'edit':
      if (state.phase !== 'result') return state;
      return { ...state, result: { ...state.result, text: action.text } };

    case 'attach-history':
      if (state.phase !== 'result') return state;
      return { ...state, result: { ...state.result, historyId: action.historyId } };

    case 'open':
      return { phase: 'result', image: action.image, result: action.result };

    case 'reset':
      return initialState;
  }
}
