import type { ProcessProgress, ProcessStage } from '../services/progress';
import type { MediaKind } from '../lib/media';
import { formatBytes } from '../lib/file';
import './ProcessingState.css';

const COPY: Record<MediaKind, Record<ProcessStage, { title: string; description: string }>> = {
  image: {
    preparing: { title: 'Menyiapkan gambar...', description: 'Sebentar, gambar sedang dirapikan.' },
    'loading-engine': {
      title: 'Menyiapkan pembaca tulisan...',
      description: 'Pemakaian pertama butuh waktu sedikit lebih lama.',
    },
    recognizing: { title: 'Membaca tulisan...', description: 'Sedang mengenali isi gambar.' },
  },
  audio: {
    preparing: { title: 'Menyiapkan audio...', description: 'Sebentar, suara sedang disiapkan.' },
    'loading-engine': {
      title: 'Menyiapkan pengenal suara...',
      description: 'Pemakaian pertama mengunduh model. Berikutnya langsung dari perangkat.',
    },
    recognizing: { title: 'Mendengarkan voice note...', description: 'Sedang mengubah suara jadi tulisan.' },
  },
};

/** Status proses yang tenang: judul, satu kalimat, progress bar bila terukur, dan teks sementara. */
export function ProcessingState({ progress, kind = 'image' }: { progress: ProcessProgress; kind?: MediaKind }) {
  const copy = COPY[kind][progress.stage];
  const percent = progress.progress === null ? null : Math.round(Math.min(1, Math.max(0, progress.progress)) * 100);
  const measurable = progress.stage !== 'preparing' && percent !== null;
  const bytes =
    progress.stage === 'loading-engine' && progress.totalBytes
      ? `${formatBytes(progress.loadedBytes ?? 0)} dari ${formatBytes(progress.totalBytes)}`
      : null;

  return (
    <div className="processing">
      <div role="status" aria-live="polite">
        <p className="processing__title">{copy.title}</p>
        <p className="processing__description">{copy.description}</p>
      </div>
      <div className="processing__meter">
        <div
          className={`progress${measurable ? '' : ' progress--indeterminate'}`}
          role="progressbar"
          aria-label={kind === 'audio' ? 'Progres mengubah suara jadi tulisan' : 'Progres membaca tulisan'}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={measurable ? percent! : undefined}
          aria-valuetext={bytes ?? undefined}
        >
          <span className="progress__bar" style={measurable ? { width: `${Math.max(4, percent!)}%` } : undefined} />
        </div>
        <span className="processing__percent" aria-hidden="true">
          {measurable ? `${percent}%` : ''}
        </span>
      </div>
      {bytes && <p className="processing__bytes">{bytes}</p>}
      {progress.partialText && (
        <div className="processing__partial">
          <p className="processing__partial-label">Terdengar sejauh ini</p>
          <p className="processing__partial-text">{progress.partialText}</p>
        </div>
      )}
    </div>
  );
}
