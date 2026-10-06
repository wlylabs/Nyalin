'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { initialState, nyalinReducer, type SelectedMedia } from './nyalinReducer';
import { historyStore, type HistoryEntry } from './historyStore';
import { NyalinError, isAbortError, type NyalinErrorCode } from '../services/errors';
import { BlurryResultError, ocrProvider, runOcr } from '../services/ocr';
import { runTranscription, transcribeProvider, type SpeechLanguage } from '../services/transcribe';
import type { ProcessProgress } from '../services/progress';
import { createThumbnail } from '../lib/file';
import { detectMediaKind, validateMediaFile, type MediaKind } from '../lib/media';

const HISTORY_SAVE_DELAY = 600;

/** Durasi dari metadata audio. WEBM hasil MediaRecorder sering melaporkan Infinity → null. */
function probeAudioDuration(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    const done = (value: number | null) => {
      audio.removeAttribute('src');
      resolve(value);
    };
    audio.onloadedmetadata = () => done(Number.isFinite(audio.duration) ? audio.duration : null);
    audio.onerror = () => done(null);
    audio.src = url;
  });
}

export interface SelectOptions {
  /** Durasi yang sudah diketahui (mis. dari timer perekam). */
  duration?: number;
}

/** Seluruh alur utama Nyalin: pilih file → proses → hasil → edit. Untuk gambar dan voice note. */
function useNyalinController() {
  const [state, dispatch] = useReducer(nyalinReducer, initialState);
  const [inputMode, setInputMode] = useState<MediaKind>('image');
  const stateRef = useRef(state);
  stateRef.current = state;

  const abortRef = useRef<AbortController | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<{ id: string; text: string } | null>(null);
  const savingManual = useRef(false);

  // Lepas object URL saat file diganti/ditinggalkan, agar memori tidak bocor.
  const mediaUrl = 'media' in state ? state.media?.url : undefined;
  useEffect(() => {
    if (!mediaUrl?.startsWith('blob:')) return;
    return () => URL.revokeObjectURL(mediaUrl);
  }, [mediaUrl]);

  const flushSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    if (pendingSave.current) historyStore.updateText(pendingSave.current.id, pendingSave.current.text);
    pendingSave.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('pagehide', flushSave);
    return () => {
      window.removeEventListener('pagehide', flushSave);
      flushSave();
      abortRef.current?.abort();
    };
  }, [flushSave]);

  const selectFile = useCallback(
    (file: File, options: SelectOptions = {}) => {
      const kind = detectMediaKind(file);
      setInputMode(kind);
      const error = validateMediaFile(file, kind);
      if (error) {
        dispatch({ type: 'selection-error', code: error });
        return;
      }
      flushSave();
      abortRef.current?.abort();
      const url = URL.createObjectURL(file);
      if (kind === 'audio' && options.duration === undefined) {
        void probeAudioDuration(url).then((duration) => {
          if (duration !== null) dispatch({ type: 'set-duration', url, duration });
        });
      }
      dispatch({
        type: 'select',
        media: {
          kind,
          url,
          name: file.name,
          size: file.size,
          duration: options.duration ?? null,
          fromHistory: false,
        },
      });
      (kind === 'audio' ? transcribeProvider : ocrProvider).warmUp?.();
    },
    [flushSave],
  );

  const saveToHistory = useCallback(async (media: SelectedMedia, text: string) => {
    const thumbnail = media.kind === 'image' ? await createThumbnail(media.url).catch(() => '') : '';
    return historyStore.add({ kind: media.kind, fileName: media.name, thumbnail, duration: media.duration, text }).id;
  }, []);

  const start = useCallback(async () => {
    const current = stateRef.current;
    if (current.phase !== 'selected' && current.phase !== 'error') return;
    let media = current.media;
    if (!media || media.fromHistory) return;

    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ type: 'start' });
    const onProgress = (progress: ProcessProgress) => {
      if (!controller.signal.aborted) dispatch({ type: 'progress', progress });
    };

    try {
      let text: string;
      let lowConfidence = false;
      if (media.kind === 'audio') {
        let duration: number | null;
        ({ text, duration } = await runTranscription({
          audioUrl: media.url,
          fileName: media.name,
          language: current.language,
          signal: controller.signal,
          onProgress,
        }));
        if (duration !== null) {
          dispatch({ type: 'set-duration', url: media.url, duration });
          media = { ...media, duration };
        }
      } else {
        ({ text, lowConfidence } = await runOcr({
          imageUrl: media.url,
          fileName: media.name,
          signal: controller.signal,
          onProgress,
        }));
      }
      if (controller.signal.aborted) return;
      const historyId = await saveToHistory(media, text);
      if (controller.signal.aborted) return;
      dispatch({ type: 'success', result: { text, lowConfidence, historyId } });
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) return;
      if (error instanceof BlurryResultError) {
        dispatch({ type: 'fail', code: 'blurry', partialText: error.text });
      } else if (error instanceof NyalinError) {
        dispatch({ type: 'fail', code: error.code });
      } else {
        console.error(error);
        dispatch({ type: 'fail', code: 'process-failed' });
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [saveToHistory]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    dispatch({ type: 'cancel' });
  }, []);

  /** Dari layar error: lihat hasil apa adanya (buram) atau ketik sendiri (kosong). */
  const showPartial = useCallback(async () => {
    const current = stateRef.current;
    if (current.phase !== 'error' || !current.media) return;
    const text = current.partialText ?? '';
    const historyId = text ? await saveToHistory(current.media, text) : null;
    dispatch({ type: 'show-partial', historyId });
  }, [saveToHistory]);

  const editText = useCallback(
    (text: string) => {
      dispatch({ type: 'edit', text });
      const current = stateRef.current;
      if (current.phase !== 'result') return;
      const id = current.result.historyId;
      if (!id) {
        // Hasil ketik manual baru masuk riwayat setelah ada isinya (sekali saja).
        if (text.trim() && !current.media.fromHistory && !savingManual.current) {
          savingManual.current = true;
          void saveToHistory(current.media, text).then((newId) => {
            savingManual.current = false;
            dispatch({ type: 'attach-history', historyId: newId });
            const latest = stateRef.current;
            if (latest.phase === 'result' && latest.result.text !== text) {
              historyStore.updateText(newId, latest.result.text);
            }
          });
        }
        return;
      }
      pendingSave.current = { id, text };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flushSave, HISTORY_SAVE_DELAY);
    },
    [flushSave, saveToHistory],
  );

  /** Error di luar pemilihan file (mis. izin mikrofon) ditampilkan seperti error pemilihan. */
  const reportError = useCallback((code: NyalinErrorCode) => dispatch({ type: 'selection-error', code }), []);

  const setLanguage = useCallback((language: SpeechLanguage) => dispatch({ type: 'set-language', language }), []);

  const openHistoryEntry = useCallback(
    (entry: HistoryEntry) => {
      flushSave();
      abortRef.current?.abort();
      const kind = entry.kind ?? 'image';
      dispatch({
        type: 'open',
        media: {
          kind,
          url: kind === 'image' ? entry.thumbnail : '',
          name: entry.fileName,
          size: null,
          duration: entry.duration ?? null,
          fromHistory: true,
        },
        result: { text: entry.text, lowConfidence: false, historyId: entry.id },
      });
    },
    [flushSave],
  );

  const reset = useCallback(() => {
    flushSave();
    abortRef.current?.abort();
    abortRef.current = null;
    dispatch({ type: 'reset' });
  }, [flushSave]);

  return useMemo(
    () => ({
      state,
      inputMode,
      setInputMode,
      selectFile,
      start,
      retry: start,
      cancel,
      showPartial,
      editText,
      setLanguage,
      reportError,
      openHistoryEntry,
      reset,
    }),
    [state, inputMode, selectFile, start, cancel, showPartial, editText, setLanguage, reportError, openHistoryEntry, reset],
  );
}

export type NyalinController = ReturnType<typeof useNyalinController>;

const NyalinContext = createContext<NyalinController | null>(null);

/** State alur hidup di layout, jadi tetap ada saat berpindah antara beranda dan Riwayat. */
export function NyalinProvider({ children }: { children: ReactNode }) {
  const controller = useNyalinController();
  return <NyalinContext.Provider value={controller}>{children}</NyalinContext.Provider>;
}

export function useNyalin(): NyalinController {
  const ctx = useContext(NyalinContext);
  if (!ctx) throw new Error('useNyalin harus dipakai di dalam NyalinProvider');
  return ctx;
}
