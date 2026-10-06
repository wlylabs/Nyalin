'use client';

import { CopyButton } from '../components/CopyButton';
import { ActionBar } from '../components/ActionBar';
import { ReceiptEditor } from '../components/ReceiptEditor';
import { ReceiptPaper } from '../components/ReceiptPaper';
import { ResultToolbar, ShareReceiptButton } from '../components/ResultToolbar';
import { formatNumber } from '../lib/text';
import { formatReceiptText, isReceiptEmpty } from '../lib/receipt';
import { useNota } from '../state/NotaProvider';

/** Halaman utama: nota yang sedang dibuat/dibuka. User cukup mengisi pembeli dan barang. */
export function NotaView() {
  const { current, editReceipt, startNew } = useNota();
  // Nota dibuat di client (butuh penyimpanan perangkat); sebelum itu tampilkan kerangka kosong.
  if (!current) return <div className="page nota-layout" aria-busy="true" />;

  const { receipt } = current;
  const receiptText = formatReceiptText(receipt);
  const empty = isReceiptEmpty(receipt);
  return (
    <div className="page nota-layout" key={current.key}>
      <section className="nota-layout__content" aria-labelledby="nota-title">
        <header>
          <h1 id="nota-title" tabIndex={-1} className="view-title">
            Nota
          </h1>
          <p className="result-header__meta" aria-live="polite">
            {formatNumber(receipt.items.length)} barang
          </p>
        </header>

        <ResultToolbar receipt={receipt} text={receiptText} onNew={startNew} disabled={empty} />
        <ReceiptEditor receipt={receipt} onChange={editReceipt} />
        <p className="result-hint" id="nota-hint">
          {empty
            ? 'Isi minimal satu barang (nama atau harga) untuk menyalin, membagikan, menyimpan gambar, atau mencetak nota.'
            : 'Semua isi nota tersimpan otomatis di Riwayat perangkat ini.'}
        </p>
      </section>

      <ActionBar mobileOnly label="Kirim nota">
        <CopyButton
          text={receiptText}
          label="Salin"
          successMessage="Nota berhasil disalin."
          size="lg"
          disabled={empty}
        />
        <ShareReceiptButton receipt={receipt} variant="primary" size="lg" disabled={empty} />
      </ActionBar>
      <ReceiptPaper receipt={receipt} />
    </div>
  );
}
