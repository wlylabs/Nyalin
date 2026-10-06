import { useCallback, useEffect, useReducer, useRef } from 'react';
import { initialState, nyalinReducer, type SelectedImage } from './nyalinReducer';
import { historyStore, type HistoryEntry } from './historyStore';
import { BlurryResultError, NyalinError, isAbortError, ocrProvider, runOcr } from '../services/ocr';
import { createThumbnail, validateImageFile } from '../lib/file';

const HISTORY_SAVE_DELAY = 600;

/** Seluruh alur utama Nyalin: pilih gambar → proses → hasil → edit. */
export function useNyalin() {
  const [state, dispatch] = useReducer(nyalinReducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const abortRef = useRef<AbortController | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<{ id: string; text: string } | null>(null);

  // Lepas object URL saat gambar diganti/ditinggalkan, agar memori tidak bocor.
  const imageUrl = 'image' in state ? state.image?.url : undefined;
  useEffect(() => {
    if (!imageUrl?.startsWith('blob:')) return;
    return () => URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

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

  const selectFile = useCallback((file: File) => {
    const error = validateImageFile(file);
    if (error) {
      dispatch({ type: 'selection-error', code: error });
      return;
    }
    flushSave();
    abortRef.current?.abort();
    dispatch({
      type: 'select',
      image: { url: URL.createObjectURL(file), name: file.name, size: file.size, fromHistory: false },
    });
    ocrProvider.warmUp?.();
  }, [flushSave]);

  const saveToHistory = useCallback(async (image: SelectedImage, text: string) => {
    const thumbnail = await createThumbnail(image.url).catch(() => '');
    return historyStore.add({ fileName: image.name, thumbnail, text }).id;
  }, []);

  const start = useCallback(async () => {
    const current = stateRef.current;
    if (current.phase !== 'selected' && current.phase !== 'error') return;
    const image = current.image;
    if (!image || image.fromHistory) return;

    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ type: 'start' });

    try {
      const outcome = await runOcr({
        imageUrl: image.url,
        fileName: image.name,
        signal: controller.signal,
        onProgress: (progress) => {
          if (!controller.signal.aborted) dispatch({ type: 'progress', progress });
        },
      });
      if (controller.signal.aborted) return;
      const historyId = await saveToHistory(image, outcome.text);
      if (controller.signal.aborted) return;
      dispatch({ type: 'success', result: { text: outcome.text, lowConfidence: outcome.lowConfidence, historyId } });
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) return;
      if (error instanceof BlurryResultError) {
        dispatch({ type: 'fail', code: 'blurry', partialText: error.text });
      } else if (error instanceof NyalinError) {
        dispatch({ type: 'fail', code: error.code });
      } else {
        console.error(error);
        dispatch({ type: 'fail', code: 'ocr-failed' });
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
    if (current.phase !== 'error' || !current.image) return;
    const text = current.partialText ?? '';
    const historyId = text ? await saveToHistory(current.image, text) : null;
    dispatch({ type: 'show-partial', historyId });
  }, [saveToHistory]);

  const editText = useCallback(
    (text: string) => {
      dispatch({ type: 'edit', text });
      const current = stateRef.current;
      if (current.phase !== 'result') return;
      const id = current.result.historyId;
      if (!id) {
        // Hasil ketik manual baru masuk riwayat setelah ada isinya.
        if (text.trim() && !current.image.fromHistory) {
          const image = current.image;
          void saveToHistory(image, text).then((newId) => {
            dispatch({ type: 'attach-history', historyId: newId });
            const latest = stateRef.current;
            if (latest.phase === 'result' && latest.result.text !== text) {
              historyStore.updateText(newId, latest.result.text);
            }
          });
          // Cegah penyimpanan ganda selama thumbnail dibuat.
          dispatch({ type: 'attach-history', historyId: 'pending' });
        }
        return;
      }
      if (id === 'pending') return;
      pendingSave.current = { id, text };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flushSave, HISTORY_SAVE_DELAY);
    },
    [flushSave, saveToHistory],
  );

  const openHistoryEntry = useCallback((entry: HistoryEntry) => {
    flushSave();
    abortRef.current?.abort();
    dispatch({
      type: 'open',
      image: { url: entry.thumbnail, name: entry.fileName, size: null, fromHistory: true },
      result: { text: entry.text, lowConfidence: false, historyId: entry.id },
    });
  }, [flushSave]);

  const reset = useCallback(() => {
    flushSave();
    abortRef.current?.abort();
    abortRef.current = null;
    dispatch({ type: 'reset' });
  }, [flushSave]);

  return { state, selectFile, start, retry: start, cancel, showPartial, editText, openHistoryEntry, reset };
}

export type NyalinController = ReturnType<typeof useNyalin>;
