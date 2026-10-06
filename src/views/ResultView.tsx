import { useRef, useState } from 'react';
import { FileText, ReceiptText, RefreshCw } from 'lucide-react';
import { ActionBar } from '../components/ActionBar';
import { AudioPreview } from '../components/AudioPreview';
import { Button } from '../components/Button';
import { CopyButton } from '../components/CopyButton';
import { FileInfo } from '../components/FileInfo';
import { useFilePicker } from '../components/FilePicker';
import { ImagePreview } from '../components/ImagePreview';
import { InlineAlert } from '../components/InlineAlert';
import { SegmentedSwitch, type SwitchOption } from '../components/ModeSwitch';
import { ReceiptEditor } from '../components/ReceiptEditor';
import { ResultEditor, type ResultEditorHandle } from '../components/ResultEditor';
import { ResultToolbar } from '../components/ResultToolbar';
import { countCharacters, countWords, formatNumber } from '../lib/text';
import { formatDuration } from '../lib/audio';
import { createReceipt, formatReceiptText, type Receipt } from '../lib/receipt';
import type { ResultData, SelectedMedia } from '../state/nyalinReducer';
import { useViewFocus } from './useViewFocus';

type ResultTab = 'text' | 'receipt';
const TAB_OPTIONS: SwitchOption<ResultTab>[] = [
  { value: 'text', label: 'Teks', Icon: FileText },
  { value: 'receipt', label: 'Nota', Icon: ReceiptText },
];

export function ResultView({
  media,
  result,
  onEdit,
  onEditReceipt,
  onAgain,
  focusOnMount,
}: {
  media: SelectedMedia;
  result: ResultData;
  onEdit: (text: string) => void;
  onEditReceipt: (receipt: Receipt | null) => void;
  onAgain: () => void;
  focusOnMount: boolean;
}) {
  const { openFiles } = useFilePicker();
  const editorRef = useRef<ResultEditorHandle>(null);
  const titleRef = useViewFocus<HTMLHeadingElement>(focusOnMount);
  const words = countWords(result.text);
  const chars = countCharacters(result.text);
  const isAudio = media.kind === 'audio';
  const hasDuration = isAudio && media.duration !== null && Number.isFinite(media.duration);
  // Hasil yang pernah dijadikan nota dibuka langsung di tab Nota.
  const [tab, setTab] = useState<ResultTab>(result.receipt ? 'receipt' : 'text');
  const receipt = result.receipt ?? null;
  const showReceipt = tab === 'receipt' && receipt !== null;
  const receiptText = receipt ? formatReceiptText(receipt) : '';

  const changeTab = (next: ResultTab) => {
    // Nota dibuat dari teks saat tab Nota pertama kali dibuka.
    if (next === 'receipt' && !receipt) onEditReceipt(createReceipt(result.text));
    setTab(next);
  };

  return (
    <div className="page result-layout">
      <section className="result-layout__media" aria-label={isAudio ? 'Voice note asli' : 'Gambar asli'}>
        {isAudio ? (
          <AudioPreview src={media.url} name={media.name} duration={media.duration} />
        ) : (
          <ImagePreview src={media.url} alt={`Gambar asli: ${media.name}`} />
        )}
        <FileInfo
          name={media.name}
          size={media.size}
          kind={media.kind}
          action={
            <Button size="sm" variant="ghost" icon={<RefreshCw />} onClick={() => openFiles(media.kind)}>
              {isAudio ? 'Ganti audio' : 'Ganti gambar'}
            </Button>
          }
        />
        {media.fromHistory && media.kind === 'image' && (
          <p className="media-note">Gambar asli tidak disimpan. Yang tampil hanya pratinjau kecil dari riwayat.</p>
        )}
      </section>

      <section className="result-layout__content" aria-labelledby="result-title">
        <header>
          <h1 id="result-title" ref={titleRef} tabIndex={-1} className="view-title">
            Hasil Nyalin
          </h1>
          <p className="result-header__meta" aria-live="polite">
            {showReceipt ? (
              <>{formatNumber(receipt.items.length)} barang</>
            ) : (
              <>
                {formatNumber(words)} kata · {formatNumber(chars)} karakter
                {hasDuration && ` · durasi ${formatDuration(media.duration!)}`}
              </>
            )}
          </p>
        </header>

        <SegmentedSwitch
          className="result-tabs"
          options={TAB_OPTIONS}
          value={showReceipt ? 'receipt' : 'text'}
          onChange={changeTab}
          label="Tampilan hasil"
        />

        {result.lowConfidence && (
          <InlineAlert tone="warning" title="Periksa lagi hasilnya">
            {isAudio
              ? 'Sebagian ucapan kurang jelas, jadi mungkin ada kata yang keliru. Dengarkan lagi bagian yang meragukan.'
              : 'Sebagian tulisan kurang jelas, jadi mungkin ada kata yang keliru. Bandingkan dengan gambar aslinya.'}
          </InlineAlert>
        )}

        {showReceipt ? (
          <>
            <ResultToolbar
              text={receiptText}
              sourceName={`nota ${media.name}`}
              copyLabel="Salin nota"
              copySuccess="Nota berhasil disalin."
              onAgain={onAgain}
            />
            <ReceiptEditor
              receipt={receipt}
              onChange={onEditReceipt}
              onRebuild={() => onEditReceipt(createReceipt(result.text, receipt.date))}
            />
            <p className="result-hint">
              Jumlah, nama barang, dan harga bisa langsung diubah. Nota tersimpan otomatis di Riwayat perangkat ini.
            </p>
          </>
        ) : (
          <>
            <ResultToolbar
              text={result.text}
              sourceName={media.name}
              onEdit={() => editorRef.current?.focus()}
              onAgain={onAgain}
            />
            <ResultEditor
              ref={editorRef}
              value={result.text}
              onChange={onEdit}
              describedBy="result-hint"
              reveal={!media.fromHistory}
            />
            <p id="result-hint" className="result-hint">
              Teks bisa langsung diubah. Perubahan tersimpan otomatis di Riwayat perangkat ini.
            </p>
          </>
        )}
      </section>

      <ActionBar mobileOnly label="Salin hasil">
        {showReceipt ? (
          <CopyButton
            text={receiptText}
            label="Salin nota"
            successMessage="Nota berhasil disalin."
            variant="primary"
            size="lg"
          />
        ) : (
          <CopyButton text={result.text} variant="primary" size="lg" />
        )}
      </ActionBar>
    </div>
  );
}
