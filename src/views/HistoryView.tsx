'use client';

import { ViewTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AudioLines, History, Plus, Trash2 } from 'lucide-react';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { IconButton } from '../components/IconButton';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { excerpt } from '../lib/text';
import { displayFileName } from '../lib/file';
import { formatDuration } from '../lib/audio';
import { formatRupiah, receiptTotal } from '../lib/receipt';
import { useFilePicker } from '../components/FilePicker';
import { useNyalin } from '../state/NyalinProvider';
import { historyStore, useHistory, type HistoryEntry } from '../state/historyStore';
import { useViewFocus } from './useViewFocus';

const timeFormat = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
});
const dateFormat = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function formatHistoryDate(timestamp: number, now = new Date()): string {
  const date = new Date(timestamp);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  if (timestamp >= startOfToday) return `Hari ini, ${timeFormat.format(date)}`;
  if (timestamp >= startOfToday - dayMs) return `Kemarin, ${timeFormat.format(date)}`;
  return `${dateFormat.format(date)}, ${timeFormat.format(date)}`;
}

/** Ringkasan entri: nama barang di nota, atau teks hasil untuk riwayat lama. */
function entryExcerpt(entry: HistoryEntry): string {
  const names = entry.receipt?.items.map((i) => i.name.trim()).filter(Boolean) ?? [];
  if (names.length) return excerpt(names.join(', '));
  return excerpt(entry.text) || 'Nota kosong';
}

export function HistoryView() {
  const entries = useHistory();
  const router = useRouter();
  const nyalin = useNyalin();
  const { openFiles } = useFilePicker();

  const onOpen = (entry: HistoryEntry) => {
    nyalin.openHistoryEntry(entry);
    router.push('/');
  };
  const onStart = () => {
    nyalin.reset();
    router.push('/');
    openFiles(nyalin.inputMode);
  };
  const toast = useToast();
  const [confirmClear, setConfirmClear] = useState(false);
  const titleRef = useViewFocus<HTMLHeadingElement>(true);

  function remove(entry: HistoryEntry) {
    historyStore.remove(entry.id);
    toast.show({
      message: 'Riwayat dihapus.',
      action: { label: 'Urungkan', onClick: () => historyStore.restore(entry) },
    });
  }

  return (
    <ViewTransition enter="vt-fade" exit="vt-fade" default="none">
      <div className="page page--narrow">
        <header className="history-header">
          <div>
            <h1 ref={titleRef} tabIndex={-1} className="view-title">
              Riwayat
            </h1>
            <p className="view-subtitle">Hanya tersimpan di browser ini. Gambar dan suara asli tidak disimpan.</p>
          </div>
          {entries.length > 0 && (
            <Button size="sm" variant="ghost" icon={<Trash2 />} onClick={() => setConfirmClear(true)}>
              Hapus semua
            </Button>
          )}
        </header>

        {entries.length === 0 ? (
          <div className="history-empty">
            <EmptyState
              icon={<History />}
              title="Belum ada riwayat"
              description="Hasil Nyalin dari gambar dan voice note akan muncul di sini supaya bisa kamu buka lagi."
            >
              <Button variant="primary" icon={<Plus />} onClick={onStart}>
                Mulai Nyalin
              </Button>
            </EmptyState>
          </div>
        ) : (
          <ul className="history-list">
            {entries.map((entry) => (
              <li key={entry.id} className="history-item">
                <button type="button" className="history-item__open" onClick={() => onOpen(entry)}>
                  {entry.kind === 'audio' ? (
                    <span className="history-item__thumb history-item__thumb--audio" aria-hidden="true">
                      <AudioLines />
                    </span>
                  ) : entry.thumbnail ? (
                    <img className="history-item__thumb" src={entry.thumbnail} alt="" loading="lazy" />
                  ) : (
                    <span className="history-item__thumb" aria-hidden="true" />
                  )}
                  <span className="history-item__body">
                    <span className="history-item__name">{displayFileName(entry.fileName)}</span>
                    <span className="history-item__date">
                      <time dateTime={new Date(entry.createdAt).toISOString()}>
                        {formatHistoryDate(entry.createdAt)}
                      </time>
                      {entry.kind === 'audio' &&
                        ` · Voice note${entry.duration ? ` ${formatDuration(entry.duration)}` : ''}`}
                      {entry.receipt && ` · Nota ${formatRupiah(receiptTotal(entry.receipt.items))}`}
                    </span>
                    <span className="history-item__excerpt">{entryExcerpt(entry)}</span>
                  </span>
                </button>
                <IconButton
                  label={`Hapus ${displayFileName(entry.fileName)}`}
                  icon={<Trash2 />}
                  onClick={() => remove(entry)}
                />
              </li>
            ))}
          </ul>
        )}

        <Modal
          open={confirmClear}
          onClose={() => setConfirmClear(false)}
          title="Hapus semua riwayat?"
          footer={
            <>
              <Button onClick={() => setConfirmClear(false)}>Batal</Button>
              <Button
                variant="danger"
                icon={<Trash2 />}
                onClick={() => {
                  historyStore.clear();
                  setConfirmClear(false);
                  toast.show({
                    message: 'Semua riwayat sudah dihapus.',
                    tone: 'success',
                  });
                }}
              >
                Hapus semua
              </Button>
            </>
          }
        >
          <p>{entries.length} hasil akan dihapus dari perangkat ini dan tidak bisa dikembalikan.</p>
        </Modal>
      </div>
    </ViewTransition>
  );
}
