import { useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { CopyButton } from '../components/CopyButton';
import { FileInfo } from '../components/FileInfo';
import { useFilePicker } from '../components/FilePicker';
import { ImagePreview } from '../components/ImagePreview';
import { InlineAlert } from '../components/InlineAlert';
import { ResultEditor, type ResultEditorHandle } from '../components/ResultEditor';
import { ResultToolbar } from '../components/ResultToolbar';
import { countCharacters, countWords, formatNumber } from '../lib/text';
import type { ResultData, SelectedImage } from '../state/nyalinReducer';
import { useViewFocus } from './useViewFocus';

export function ResultView({
  image,
  result,
  onEdit,
  onAgain,
  focusOnMount,
}: {
  image: SelectedImage;
  result: ResultData;
  onEdit: (text: string) => void;
  onAgain: () => void;
  focusOnMount: boolean;
}) {
  const { openFiles } = useFilePicker();
  const editorRef = useRef<ResultEditorHandle>(null);
  const titleRef = useViewFocus<HTMLHeadingElement>(focusOnMount);
  const words = countWords(result.text);
  const chars = countCharacters(result.text);

  return (
    <div className="page result-layout view-enter">
      <section className="result-layout__media" aria-label="Gambar asli">
        <ImagePreview src={image.url} alt={`Gambar asli: ${image.name}`} />
        <FileInfo
          name={image.name}
          size={image.size}
          action={
            <Button size="sm" variant="ghost" icon={<RefreshCw />} onClick={openFiles}>
              Ganti gambar
            </Button>
          }
        />
        {image.fromHistory && (
          <p className="media-note">Gambar asli tidak disimpan. Yang tampil hanya pratinjau kecil dari riwayat.</p>
        )}
      </section>

      <section className="result-layout__content" aria-labelledby="result-title">
        <header>
          <h1 id="result-title" ref={titleRef} tabIndex={-1} className="view-title">
            Hasil Nyalin
          </h1>
          <p className="result-header__meta" aria-live="polite">
            {formatNumber(words)} kata · {formatNumber(chars)} karakter
          </p>
        </header>

        {result.lowConfidence && (
          <InlineAlert tone="warning" title="Periksa lagi hasilnya">
            Sebagian tulisan kurang jelas, jadi mungkin ada kata yang keliru. Bandingkan dengan gambar aslinya.
          </InlineAlert>
        )}

        <ResultToolbar
          text={result.text}
          sourceName={image.name}
          onEdit={() => editorRef.current?.focus()}
          onAgain={onAgain}
        />
        <ResultEditor ref={editorRef} value={result.text} onChange={onEdit} describedBy="result-hint" />
        <p id="result-hint" className="result-hint">
          Teks bisa langsung diubah. Perubahan tersimpan otomatis di Riwayat perangkat ini.
        </p>
      </section>

      <ActionBar mobileOnly label="Salin hasil">
        <CopyButton text={result.text} variant="primary" size="lg" />
      </ActionBar>
    </div>
  );
}
