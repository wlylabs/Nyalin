import { useState } from 'react';
import { ImageDown, Printer, RotateCcw, Share2 } from 'lucide-react';
import { Button, type ButtonProps } from './Button';
import { CopyButton } from './CopyButton';
import { useToast } from './Toast';
import { downloadReceiptImage, shareReceipt } from '../lib/receiptImage';
import type { Receipt } from '../lib/receipt';
import './ResultToolbar.css';

/** Bagikan nota (gambar + teks) lewat menu Bagikan perangkat, dengan pesan hasil yang jelas. */
export function ShareReceiptButton({
  receipt,
  ...props
}: { receipt: Receipt } & Omit<ButtonProps, 'onClick' | 'icon' | 'children'>) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      {...props}
      icon={<Share2 />}
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const outcome = await shareReceipt(receipt);
          if (outcome === 'downloaded')
            toast.show({ message: 'Perangkat ini belum bisa berbagi langsung. Gambar nota diunduh.', tone: 'success' });
        } catch {
          toast.show({ message: 'Nota belum bisa dibagikan. Coba salin nota.', tone: 'error' });
        } finally {
          setBusy(false);
        }
      }}
    >
      Bagikan
    </Button>
  );
}

/**
 * Aksi nota. Di ponsel "Salin nota" & "Bagikan" pindah ke action bar bawah,
 * jadi toolbar ini berisi aksi pendukung saja.
 */
export function ResultToolbar({
  receipt,
  text,
  onNew,
}: {
  receipt: Receipt;
  /** Teks nota (format WhatsApp). */
  text: string;
  onNew: () => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  return (
    <div className="result-toolbar" role="toolbar" aria-label="Aksi nota">
      <CopyButton
        text={text}
        label="Salin nota"
        successMessage="Nota berhasil disalin."
        variant="primary"
        className="result-toolbar__desktop"
      />
      <ShareReceiptButton receipt={receipt} className="result-toolbar__desktop" />
      <Button
        icon={<ImageDown />}
        size="sm"
        variant="ghost"
        loading={saving}
        onClick={async () => {
          setSaving(true);
          try {
            const name = await downloadReceiptImage(receipt);
            toast.show({ message: `Gambar nota diunduh sebagai ${name}.`, tone: 'success' });
          } catch {
            toast.show({ message: 'Gambar nota belum bisa dibuat.', tone: 'error' });
          } finally {
            setSaving(false);
          }
        }}
      >
        Simpan gambar
      </Button>
      <Button icon={<Printer />} size="sm" variant="ghost" onClick={() => window.print()}>
        Cetak / PDF
      </Button>
      <Button icon={<RotateCcw />} size="sm" variant="ghost" onClick={onNew}>
        Nota baru
      </Button>
    </div>
  );
}
