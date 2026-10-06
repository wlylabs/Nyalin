import type { OcrProgress } from '../services/ocr';
import './ProcessingState.css';

const COPY: Record<OcrProgress['stage'], { title: string; description: string }> = {
  preparing: { title: 'Menyiapkan gambar...', description: 'Sebentar, gambar sedang dirapikan.' },
  'loading-engine': {
    title: 'Menyiapkan pembaca tulisan...',
    description: 'Pemakaian pertama butuh waktu sedikit lebih lama.',
  },
  recognizing: { title: 'Membaca tulisan...', description: 'Sedang mengenali isi gambar.' },
};

/** Status proses yang tenang: judul, satu kalimat, dan progress bar bila progresnya terukur. */
export function ProcessingState({ progress }: { progress: OcrProgress }) {
  const copy = COPY[progress.stage];
  const percent = progress.progress === null ? null : Math.round(Math.min(1, Math.max(0, progress.progress)) * 100);
  const showPercent = progress.stage === 'recognizing' && percent !== null;

  return (
    <div className="processing">
      <div role="status" aria-live="polite">
        <p className="processing__title">{copy.title}</p>
        <p className="processing__description">{copy.description}</p>
      </div>
      <div className="processing__meter">
        <div
          className={`progress${showPercent ? '' : ' progress--indeterminate'}`}
          role="progressbar"
          aria-label="Progres membaca tulisan"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={showPercent ? percent! : undefined}
        >
          <span className="progress__bar" style={showPercent ? { width: `${Math.max(4, percent!)}%` } : undefined} />
        </div>
        <span className="processing__percent" aria-hidden="true">
          {showPercent ? `${percent}%` : ''}
        </span>
      </div>
    </div>
  );
}
