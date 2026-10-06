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
  return (
    <div className="page page--narrow stack view-enter" aria-busy="true">
      <h1 className="sr-only">{media.kind === 'audio' ? 'Sedang memproses voice note' : 'Sedang memproses gambar'}</h1>
      <ProcessingState progress={progress} kind={media.kind} />
      {media.kind === 'audio' ? (
        <AudioPreview src={media.url} name={media.name} duration={media.duration} dimmed />
      ) : (
        <ImagePreview src={media.url} alt={`Gambar yang sedang dibaca: ${media.name}`} dimmed />
      )}
      <ActionBar label="Proses">
        <Button onClick={onCancel}>Batalkan</Button>
      </ActionBar>
    </div>
  );
}
