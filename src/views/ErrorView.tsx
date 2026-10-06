import { Eye, PencilLine, RotateCcw, Upload } from 'lucide-react';
import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { ErrorState } from '../components/ErrorState';
import { FileInfo } from '../components/FileInfo';
import { useFilePicker } from '../components/FilePicker';
import { ERROR_COPY } from '../content/errors';
import type { SelectedImage } from '../state/nyalinReducer';
import type { NyalinErrorCode } from '../services/ocr';
import { useEffect } from 'react';

export function ErrorView({
  code,
  image,
  hasPartial,
  onRetry,
  onShowPartial,
}: {
  code: NyalinErrorCode;
  image: SelectedImage | null;
  hasPartial: boolean;
  onRetry: () => void;
  onShowPartial: () => void;
}) {
  const { openFiles } = useFilePicker();
  const copy = ERROR_COPY[code];

  useEffect(() => {
    document.getElementById('error-title')?.focus({ preventScroll: true });
  }, [code]);

  let secondary = null;
  if (copy.retryable && image && !image.fromHistory) {
    secondary = (
      <Button icon={<RotateCcw />} onClick={onRetry}>
        Coba lagi
      </Button>
    );
  } else if (code === 'blurry' && hasPartial) {
    secondary = (
      <Button icon={<Eye />} onClick={onShowPartial}>
        Lihat hasil apa adanya
      </Button>
    );
  } else if (code === 'empty-result' && image) {
    secondary = (
      <Button icon={<PencilLine />} onClick={onShowPartial}>
        Ketik sendiri
      </Button>
    );
  }

  return (
    <div className="page page--narrow stack view-enter">
      <ErrorState code={code} />
      {image && <FileInfo name={image.name} size={image.size} />}
      <ActionBar label="Langkah berikutnya">
        {secondary}
        <Button variant="primary" icon={<Upload />} onClick={openFiles}>
          Coba gambar lain
        </Button>
      </ActionBar>
    </div>
  );
}
