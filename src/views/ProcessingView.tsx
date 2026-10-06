import { ActionBar } from '../components/ActionBar';
import { AudioPreview } from '../components/AudioPreview';
import { Button } from '../components/Button';
import { ImagePreview } from '../components/ImagePreview';
import { ProcessingState } from '../components/ProcessingState';
import type { SelectedMedia } from '../state/nyalinReducer';
import type { ProcessProgress } from '../services/progress';

export function ProcessingView({
  media,
  progress,
  onCancel,
}: {
  media: SelectedMedia;
  progress: ProcessProgress;
  onCancel: () => void;
}) {
  // Animasi pindai/gelombang hanya mengikuti progres nyata saat tahap mengenali.
  const measured = progress.stage === 'recognizing' ? progress.progress : null;

  return (
    <div className="page page--narrow stack" aria-busy="true">
      <h1 className="sr-only">{media.kind === 'audio' ? 'Sedang memproses voice note' : 'Sedang memproses gambar'}</h1>
      <ProcessingState progress={progress} kind={media.kind} />
      {media.kind === 'audio' ? (
        <AudioPreview src={media.url} name={media.name} duration={media.duration} listening={measured} />
      ) : (
        <ImagePreview src={media.url} alt={`Gambar yang sedang dibaca: ${media.name}`} dimmed scanning={measured} />
      )}
      <ActionBar label="Proses">
        <Button onClick={onCancel}>Batalkan</Button>
      </ActionBar>
    </div>
  );
}
