'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { historyStore, type HistoryEntry } from './historyStore';
import { createReceipt, emptyItem, type Receipt } from '../lib/receipt';
import { claimReceiptNumber, receiptDefaults } from '../lib/storeProfile';

const HISTORY_SAVE_DELAY = 600;

export interface CurrentNota {
  receipt: Receipt;
  /** null = belum masuk riwayat (masih kosong). */
  historyId: string | null;
  /** Kunci tampilan: berganti hanya saat pindah ke nota lain. */
  key: string;
}

function blankNota(): CurrentNota {
  const receipt = { ...createReceipt('', Date.now(), receiptDefaults()), items: [emptyItem()] };
  return { receipt, historyId: null, key: `baru-${Date.now().toString(36)}` };
}

/** Nota dianggap berisi bila ada barang atau pembeli yang diisi. */
function hasContent(receipt: Receipt): boolean {
  return Boolean(receipt.customer?.trim()) || receipt.items.some((i) => i.name.trim() || i.price > 0);
}

/** Nota yang sedang dibuka + penyimpanan otomatis ke riwayat. */
function useNotaController() {
  // Dibuat di client (butuh localStorage & jam perangkat), jadi null saat render server.
  const [current, setCurrent] = useState<CurrentNota | null>(null);
  const currentRef = useRef(current);
  currentRef.current = current;
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<{ id: string; receipt: Receipt } | null>(null);

  const flushSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    if (pendingSave.current) historyStore.update(pendingSave.current.id, { receipt: pendingSave.current.receipt });
    pendingSave.current = null;
  }, []);

  useEffect(() => {
    setCurrent((c) => c ?? blankNota());
    window.addEventListener('pagehide', flushSave);
    return () => {
      window.removeEventListener('pagehide', flushSave);
      flushSave();
    };
  }, [flushSave]);

  const editReceipt = useCallback(
    (receipt: Receipt) => {
      const nota = currentRef.current;
      if (!nota) return;
      let { historyId } = nota;
      if (historyId) {
        pendingSave.current = { id: historyId, receipt };
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(flushSave, HISTORY_SAVE_DELAY);
      } else if (hasContent(receipt)) {
        // Nota baru masuk riwayat (dan memakai nomornya) begitu ada isinya.
        historyId = historyStore.add({ kind: 'manual', receipt }).id;
        if (receipt.number) claimReceiptNumber(receipt.number);
      }
      const next = { ...nota, receipt, historyId };
      currentRef.current = next;
      setCurrent(next);
    },
    [flushSave],
  );

  const startNew = useCallback(() => {
    flushSave();
    setCurrent(blankNota());
  }, [flushSave]);

  const openHistoryEntry = useCallback(
    (entry: HistoryEntry) => {
      flushSave();
      // Riwayat dari versi lama (nota dari foto/voice note) yang belum punya nota: dibaca dari teksnya.
      const receipt = entry.receipt ?? createReceipt(entry.text ?? '', entry.createdAt);
      setCurrent({ receipt, historyId: entry.id, key: entry.id });
    },
    [flushSave],
  );

  return useMemo(
    () => ({ current, editReceipt, startNew, openHistoryEntry }),
    [current, editReceipt, startNew, openHistoryEntry],
  );
}

export type NotaController = ReturnType<typeof useNotaController>;

const NotaContext = createContext<NotaController | null>(null);

/** State nota hidup di layout, jadi tetap ada saat berpindah antara nota dan Riwayat. */
export function NotaProvider({ children }: { children: ReactNode }) {
  const controller = useNotaController();
  return <NotaContext.Provider value={controller}>{children}</NotaContext.Provider>;
}

export function useNota(): NotaController {
  const ctx = useContext(NotaContext);
  if (!ctx) throw new Error('useNota harus dipakai di dalam NotaProvider');
  return ctx;
}
