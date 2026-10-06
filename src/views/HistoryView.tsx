'use client';

import { ViewTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { History, Plus, ReceiptText, Trash2 } from 'lucide-react';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { IconButton } from '../components/IconButton';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { excerpt } from '../lib/text';
import { formatRupiah, receiptGrandTotal } from '../lib/receipt';
import { useNota } from '../state/NotaProvider';
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

/** Judul entri: nama toko di nota, atau nama file sumbernya. */
function entryName(entry: HistoryEntry): string {
  const title = entry.receipt?.title.trim();
  if (title) return title;
  return entry.receipt || !entry.fileName ? 'Nota tanpa nama toko' : entry.fileName.replace(/\.[^.]+$/, '');
}

/** Ringkasan entri: nama barang di nota, atau teks hasil untuk riwayat lama. */
function entryExcerpt(entry: HistoryEntry): string {
  const names = entry.receipt?.items.map((i) => i.name.trim()).filter(Boolean) ?? [];
  if (names.length) return excerpt(names.join(', '));
  return excerpt(entry.text ?? '') || 'Nota kosong';
}

export function HistoryView() {
  const entries = useHistory();
  const router = useRouter();
  const nota = useNota();

  const onOpen = (entry: HistoryEntry) => {
    nota.openHistoryEntry(entry);
    router.push('/');
  };
  const onStart = () => {
    nota.startNew();
    router.push('/');
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
            <p className="view-subtitle">Nota hanya tersimpan di browser ini.</p>
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
              description="Nota yang kamu buat akan muncul di sini supaya bisa dibuka, dikirim, atau dicetak lagi."
            >
              <Button variant="primary" icon={<Plus />} onClick={onStart}>
                Nota baru
              </Button>
            </EmptyState>
          </div>
        ) : (
          <ul className="history-list">
            {entries.map((entry) => (
              <li key={entry.id} className="history-item">
                <button type="button" className="history-item__open" onClick={() => onOpen(entry)}>
                  <span className="history-item__thumb history-item__thumb--icon" aria-hidden="true">
                    <ReceiptText />
                  </span>
                  <span className="history-item__body">
                    <span className="history-item__name">{entryName(entry)}</span>
                    <span className="history-item__date">
                      <time dateTime={new Date(entry.createdAt).toISOString()}>
                        {formatHistoryDate(entry.createdAt)}
                      </time>
                      {entry.receipt?.number && ` · No. ${entry.receipt.number}`}
                      {entry.receipt && ` · ${formatRupiah(receiptGrandTotal(entry.receipt))}`}
                    </span>
                    <span className="history-item__excerpt">{entryExcerpt(entry)}</span>
                  </span>
                </button>
                <IconButton label={`Hapus ${entryName(entry)}`} icon={<Trash2 />} onClick={() => remove(entry)} />
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
