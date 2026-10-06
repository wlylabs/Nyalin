import { Eye, PencilLine, RotateCcw, Upload } from 'lucide-react';
import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { ErrorState } from '../components/ErrorState';
import { FileInfo } from '../components/FileInfo';
import { useFilePicker } from '../components/FilePicker';
import { getErrorCopy } from '../content/errors';
import type { SelectedMedia } from '../state/nyalinReducer';
import type { NyalinErrorCode } from '../services/errors';
import { useEffect } from 'react';

export function ErrorView({
  code,
  media,
  hasPartial,
  onRetry,
  onShowPartial,
}: {
  code: NyalinErrorCode;
  media: SelectedMedia | null;
  hasPartial: boolean;
  onRetry: () => void;
  onShowPartial: () => void;
}) {
  const { openFiles } = useFilePicker();
  const kind = media?.kind ?? 'image';
  const copy = getErrorCopy(code, kind);

  useEffect(() => {
    document.getElementById('error-title')?.focus({ preventScroll: true });
  }, [code]);

  let secondary = null;
  if (copy.retryable && media && !media.fromHistory) {
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
  } else if (code === 'empty-result' && media) {
    secondary = (
      <Button icon={<PencilLine />} onClick={onShowPartial}>
        Ketik sendiri
      </Button>
    );
  }

  return (
    <div className="page page--narrow stack">
      <ErrorState code={code} kind={kind} />
      {media && <FileInfo name={media.name} size={media.size} kind={media.kind} />}
      <ActionBar label="Langkah berikutnya">
        {secondary}
        <Button variant="primary" icon={<Upload />} onClick={() => openFiles(kind)}>
          {kind === 'audio' ? 'Coba audio lain' : 'Coba gambar lain'}
        </Button>
      </ActionBar>
    </div>
  );
}
