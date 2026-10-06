import { AudioLines } from 'lucide-react';
import { formatDuration } from '../lib/audio';
import './AudioPreview.css';

/**
 * Pratinjau voice note: pemutar native (paling aksesibel: keyboard, pembaca layar, kontrol kecepatan
 * di sebagian browser) di dalam kartu yang serasi dengan pratinjau gambar.
 */
export function AudioPreview({
  src,
  name,
  duration,
  dimmed = false,
}: {
  src: string;
  name: string;
  duration: number | null;
  dimmed?: boolean;
}) {
  return (
    <figure className={`audio-preview${dimmed ? ' is-dimmed' : ''}`}>
      <span className="audio-preview__icon" aria-hidden="true">
        <AudioLines />
      </span>
      {duration !== null && Number.isFinite(duration) && (
        <p className="audio-preview__duration">{formatDuration(duration)}</p>
      )}
      {src ? (
        <audio className="audio-preview__player" src={src} controls preload="metadata" aria-label={`Putar ${name}`} />
      ) : (
        <p className="audio-preview__missing">Voice note asli tidak disimpan. Yang tersimpan hanya teksnya.</p>
      )}
    </figure>
  );
}
