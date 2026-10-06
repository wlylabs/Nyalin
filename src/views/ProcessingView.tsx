import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { ImagePreview } from '../components/ImagePreview';
import { ProcessingState } from '../components/ProcessingState';
import type { SelectedImage } from '../state/nyalinReducer';
import type { OcrProgress } from '../services/ocr';

export function ProcessingView({
  image,
  progress,
  onCancel,
}: {
  image: SelectedImage;
  progress: OcrProgress;
  onCancel: () => void;
}) {
  return (
    <div className="page page--narrow stack view-enter" aria-busy="true">
      <h1 className="sr-only">Sedang memproses gambar</h1>
      <ProcessingState progress={progress} />
      <ImagePreview src={image.url} alt={`Gambar yang sedang dibaca: ${image.name}`} dimmed />
      <ActionBar label="Proses">
        <Button onClick={onCancel}>Batalkan</Button>
      </ActionBar>
    </div>
  );
}
