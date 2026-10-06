import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { ActionBar } from '../components/ActionBar';
import { AudioPreview } from '../components/AudioPreview';
import { Button } from '../components/Button';
import { CopyButton } from '../components/CopyButton';
import { FileInfo } from '../components/FileInfo';
import { useFilePicker } from '../components/FilePicker';
import { ImagePreview } from '../components/ImagePreview';
import { InlineAlert } from '../components/InlineAlert';
import { ReceiptEditor } from '../components/ReceiptEditor';
import { ReceiptPaper } from '../components/ReceiptPaper';
import { ResultToolbar, ShareReceiptButton } from '../components/ResultToolbar';
import { formatNumber } from '../lib/text';
import { formatDuration } from '../lib/audio';
import { analyzeReceiptText, createReceipt, formatReceiptText, type Receipt } from '../lib/receipt';
import type { ResultData, SelectedMedia } from '../state/nyalinReducer';
import { useViewFocus } from './useViewFocus';

export function ResultView({
  media,
  result,
  onEditReceipt,
  onAgain,
  focusOnMount,
}: {
  /** null = nota manual (tanpa foto/suara). */
  media: SelectedMedia | null;
  result: ResultData;
  onEditReceipt: (receipt: Receipt | null) => void;
  onAgain: () => void;
  focusOnMount: boolean;
}) {
  const { openFiles } = useFilePicker();
  const titleRef = useViewFocus<HTMLHeadingElement>(focusOnMount);
  const isAudio = media?.kind === 'audio';
  const hasDuration = isAudio && media.duration !== null && Number.isFinite(media.duration);
  // Riwayat lama (sebelum ada nota) belum punya nota: dibaca dari teksnya, tersimpan saat diedit.
  const [fallbackReceipt] = useState(() => createReceipt(result.text));
  const receipt = result.receipt ?? fallbackReceipt;
  const receiptText = formatReceiptText(receipt);

  /** Baca ulang barang dari teks asli; identitas nota (toko, nomor, pembeli, bayar) tetap. */
  const rebuild = () => {
    const found = analyzeReceiptText(result.text);
    onEditReceipt({ ...receipt, items: found.items, discount: found.discount, printedTotal: found.printedTotal });
  };

  return (
    <div className={`page result-layout${media ? '' : ' result-layout--solo'}`}>
      {media && (
        <section className="result-layout__media" aria-label={isAudio ? 'Voice note asli' : 'Foto asli'}>
          {isAudio ? (
            <AudioPreview src={media.url} name={media.name} duration={media.duration} />
          ) : (
            <ImagePreview src={media.url} alt={`Foto asli: ${media.name}`} />
          )}
          <FileInfo
            name={media.name}
            size={media.size}
            kind={media.kind}
            action={
              <Button size="sm" variant="ghost" icon={<RefreshCw />} onClick={() => openFiles(media.kind)}>
                {isAudio ? 'Ganti audio' : 'Ganti foto'}
              </Button>
            }
          />
          {media.fromHistory && media.kind === 'image' && (
            <p className="media-note">Foto asli tidak disimpan. Yang tampil hanya pratinjau kecil dari riwayat.</p>
          )}
        </section>
      )}

      <section className="result-layout__content" aria-labelledby="result-title">
        <header>
          <h1 id="result-title" ref={titleRef} tabIndex={-1} className="view-title">
            {media ? 'Nota' : 'Nota baru'}
          </h1>
          <p className="result-header__meta" aria-live="polite">
            {formatNumber(receipt.items.length)} barang
            {hasDuration && ` · durasi ${formatDuration(media.duration!)}`}
          </p>
        </header>

        {result.lowConfidence && (
          <InlineAlert tone="warning" title="Periksa lagi hasilnya">
            {isAudio
              ? 'Sebagian ucapan kurang jelas, jadi mungkin ada barang atau harga yang keliru. Dengarkan lagi bagian yang meragukan.'
              : 'Sebagian tulisan kurang jelas, jadi mungkin ada barang atau harga yang keliru. Bandingkan dengan foto aslinya.'}
          </InlineAlert>
        )}

        <ResultToolbar receipt={receipt} text={receiptText} onNew={onAgain} />
        <ReceiptEditor
          receipt={receipt}
          onChange={onEditReceipt}
          onRebuild={media && result.text.trim() ? rebuild : undefined}
        />
        <p className="result-hint">
          Semua isi nota bisa langsung diubah dan tersimpan otomatis di Riwayat perangkat ini.
        </p>
      </section>

      <ActionBar mobileOnly label="Kirim nota">
        <CopyButton text={receiptText} label="Salin" successMessage="Nota berhasil disalin." size="lg" />
        <ShareReceiptButton receipt={receipt} variant="primary" size="lg" />
      </ActionBar>
      <ReceiptPaper receipt={receipt} />
    </div>
  );
}
