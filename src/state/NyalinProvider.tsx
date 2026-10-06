'use client';

import {
  addTransitionType,
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { initialState, nyalinReducer, type NyalinAction, type SelectedMedia } from './nyalinReducer';
import { historyStore, type HistoryEntry, type HistoryPatch } from './historyStore';
import { NyalinError, isAbortError, type NyalinErrorCode } from '../services/errors';
import { BlurryResultError, ocrProvider, runOcr } from '../services/ocr';
import { runTranscription, transcribeProvider, type SpeechLanguage } from '../services/transcribe';
import type { ProcessProgress } from '../services/progress';
import { createThumbnail } from '../lib/file';
import { detectMediaKind, validateMediaFile, type MediaKind } from '../lib/media';
import { createReceipt, type Receipt } from '../lib/receipt';

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

  /**
   * Perpindahan tahap dibungkus transition + tipe arah, sehingga <ViewTransition>
   * menganimasikan "maju" (naik) atau "mundur" (turun). Update kecil (progres, edit) tidak.
   */
  const go = useCallback((action: NyalinAction, direction: 'forward' | 'back' = 'forward') => {
    startTransition(() => {
      addTransitionType(direction);
      dispatch(action);
    });
  }, []);
  const [inputMode, setInputMode] = useState<MediaKind>('image');
  const stateRef = useRef(state);
  stateRef.current = state;

  const abortRef = useRef<AbortController | null>(null);
  /** Hentikan proses yang sedang berjalan (bila ada). */
  const abortRunning = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<{ id: string; patch: HistoryPatch } | null>(null);
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
    if (pendingSave.current) historyStore.update(pendingSave.current.id, pendingSave.current.patch);
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
      abortRunning();
      const url = URL.createObjectURL(file);
      if (kind === 'audio' && options.duration === undefined) {
        void probeAudioDuration(url).then((duration) => {
          if (duration !== null) dispatch({ type: 'set-duration', url, duration });
        });
      }
      go({
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
    [flushSave, go, abortRunning],
  );

  const saveToHistory = useCallback(async (media: SelectedMedia, text: string, receipt: Receipt | null = null) => {
    const thumbnail = media.kind === 'image' ? await createThumbnail(media.url).catch(() => '') : '';
    return historyStore.add({
      kind: media.kind,
      fileName: media.name,
      thumbnail,
      duration: media.duration,
      text,
      receipt,
    }).id;
  }, []);

  const start = useCallback(async () => {
    const current = stateRef.current;
    if (current.phase !== 'selected' && current.phase !== 'error') return;
    let media = current.media;
    if (!media || media.fromHistory) return;
    // Klik ganda: state belum berganti (transition), tapi proses sudah berjalan.
    if (abortRef.current && !abortRef.current.signal.aborted) return;

    const controller = new AbortController();
    abortRef.current = controller;
    go({ type: 'start' });
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
      // Hasil langsung dibaca jadi nota dan ikut tersimpan di riwayat.
      const receipt = createReceipt(text);
      const historyId = await saveToHistory(media, text, receipt);
      if (controller.signal.aborted) return;
      go({ type: 'success', result: { text, lowConfidence, historyId, receipt } });
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) return;
      if (error instanceof BlurryResultError) {
        go({ type: 'fail', code: 'blurry', partialText: error.text });
      } else if (error instanceof NyalinError) {
        go({ type: 'fail', code: error.code });
      } else {
        console.error(error);
        go({ type: 'fail', code: 'process-failed' });
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [saveToHistory, go]);

  const cancel = useCallback(() => {
    abortRunning();
    go({ type: 'cancel' }, 'back');
  }, [go, abortRunning]);

  /** Dari layar error: lihat hasil apa adanya (buram) atau ketik sendiri (kosong). */
  const showingPartial = useRef(false);
  const showPartial = useCallback(async () => {
    const current = stateRef.current;
    if (current.phase !== 'error' || !current.media || showingPartial.current) return;
    showingPartial.current = true;
    try {
      const text = current.partialText ?? '';
      const historyId = text ? await saveToHistory(current.media, text) : null;
      go({ type: 'show-partial', historyId });
    } finally {
      showingPartial.current = false;
    }
  }, [saveToHistory, go]);

  /**
   * Simpan perubahan hasil (teks / nota) ke riwayat dengan jeda, agar tidak menulis tiap ketukan.
   * Nota yang diisi manual baru masuk riwayat setelah ada isinya (sekali saja).
   */
  const persistResult = useCallback(
    (patch: HistoryPatch) => {
      const current = stateRef.current;
      if (current.phase !== 'result') return;
      const id = current.result.historyId;
      if (!id) {
        // stateRef belum memuat dispatch barusan, jadi gabungkan patch secara manual.
        const { text, receipt = null } = { ...current.result, ...patch };
        const hasContent = Boolean(text.trim() || receipt?.items.length);
        if (hasContent && !current.media.fromHistory && !savingManual.current) {
          savingManual.current = true;
          void saveToHistory(current.media, text, receipt).then((newId) => {
            savingManual.current = false;
            dispatch({ type: 'attach-history', historyId: newId });
            const latest = stateRef.current;
            if (
              latest.phase === 'result' &&
              (latest.result.text !== text || (latest.result.receipt ?? null) !== receipt)
            ) {
              historyStore.update(newId, { text: latest.result.text, receipt: latest.result.receipt ?? null });
            }
          });
        }
        return;
      }
      const merged = pendingSave.current?.id === id ? { ...pendingSave.current.patch, ...patch } : patch;
      if (pendingSave.current && pendingSave.current.id !== id) flushSave();
      pendingSave.current = { id, patch: merged };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flushSave, HISTORY_SAVE_DELAY);
    },
    [flushSave, saveToHistory],
  );

  const editReceipt = useCallback(
    (receipt: Receipt | null) => {
      dispatch({ type: 'edit-receipt', receipt });
      persistResult({ receipt });
    },
    [persistResult],
  );

  /** Error di luar pemilihan file (mis. izin mikrofon) ditampilkan seperti error pemilihan. */
  const reportError = useCallback((code: NyalinErrorCode) => dispatch({ type: 'selection-error', code }), []);

  const setLanguage = useCallback((language: SpeechLanguage) => dispatch({ type: 'set-language', language }), []);

  const openHistoryEntry = useCallback(
    (entry: HistoryEntry) => {
      flushSave();
      abortRunning();
      const kind = entry.kind ?? 'image';
      go({
        type: 'open',
        media: {
          kind,
          url: kind === 'image' ? entry.thumbnail : '',
          name: entry.fileName,
          size: null,
          duration: entry.duration ?? null,
          fromHistory: true,
        },
        result: { text: entry.text, lowConfidence: false, historyId: entry.id, receipt: entry.receipt ?? null },
      });
    },
    [flushSave, go, abortRunning],
  );

  const reset = useCallback(() => {
    flushSave();
    abortRunning();
    go({ type: 'reset' }, 'back');
  }, [flushSave, go, abortRunning]);

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
      editReceipt,
      setLanguage,
      reportError,
      openHistoryEntry,
      reset,
    }),
    [
      state,
      inputMode,
      selectFile,
      start,
      cancel,
      showPartial,
      editReceipt,
      setLanguage,
      reportError,
      openHistoryEntry,
      reset,
    ],
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
