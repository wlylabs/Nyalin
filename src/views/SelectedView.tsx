import { ArrowRight, RefreshCw } from 'lucide-react';
import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { FileInfo } from '../components/FileInfo';
import { useFilePicker } from '../components/FilePicker';
import { ImagePreview } from '../components/ImagePreview';
import { PrivacyNote } from '../components/PrivacyNote';
import type { SelectedImage } from '../state/nyalinReducer';
import type { NyalinErrorCode } from '../services/ocr';
import { SelectionAlert } from './SelectionAlert';
import { useViewFocus } from './useViewFocus';

export function SelectedView({
  image,
  selectionError,
  onStart,
  focusOnMount,
}: {
  image: SelectedImage;
  selectionError: NyalinErrorCode | null;
  onStart: () => void;
  focusOnMount: boolean;
}) {
  const { openFiles } = useFilePicker();
  const titleRef = useViewFocus<HTMLHeadingElement>(focusOnMount);

  return (
    <div className="page page--narrow stack view-enter">
      <header>
        <h1 ref={titleRef} tabIndex={-1} className="view-title">
          Cek gambarnya dulu
        </h1>
        <p className="view-subtitle">Pastikan tulisan terlihat jelas, lalu mulai.</p>
      </header>

      {selectionError && <SelectionAlert code={selectionError} />}
      <ImagePreview src={image.url} alt={`Pratinjau ${image.name}`} />
      <FileInfo name={image.name} size={image.size} />
      <PrivacyNote />

      <ActionBar label="Lanjutkan">
        <Button icon={<RefreshCw />} onClick={openFiles}>
          Ganti gambar
        </Button>
        <Button variant="primary" icon={<ArrowRight />} onClick={onStart}>
          Mulai Nyalin
        </Button>
      </ActionBar>
    </div>
  );
}
