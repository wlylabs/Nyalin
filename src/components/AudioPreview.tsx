import { ViewTransition } from 'react';
import { AudioLines } from 'lucide-react';
import { formatDuration } from '../lib/audio';
import { MEDIA_TRANSITION_NAME } from './ImagePreview';
import './AudioPreview.css';

const WAVE_BARS = 40;
/** Tinggi batang deterministik (bukan acak per render) agar gelombang tidak "berkedip". */
const WAVE = Array.from({ length: WAVE_BARS }, (_, i) => 0.28 + 0.72 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.45)));

/**
 * Pratinjau voice note: pemutar native (paling aksesibel: keyboard, pembaca layar, kontrol kecepatan
 * di sebagian browser) di dalam kartu yang serasi dengan pratinjau gambar.
 * Saat `listening`, pemutar diganti gelombang yang terisi sesuai progres transkripsi yang sebenarnya.
 */
export function AudioPreview({
  src,
  name,
  duration,
  listening,
}: {
  src: string;
  name: string;
  duration: number | null;
  /** Progres 0–1, `null` = belum terukur, `undefined` = tampilkan pemutar. */
  listening?: number | null;
}) {
  const isListening = listening !== undefined;
  const filled = Math.round((listening ?? 0) * WAVE_BARS);

  return (
    <ViewTransition name={MEDIA_TRANSITION_NAME} share="vt-morph">
      <figure className={`audio-preview${isListening ? ' is-listening' : ''}`}>
        <span className="audio-preview__icon" aria-hidden="true">
          <AudioLines />
        </span>
        {duration !== null && Number.isFinite(duration) && (
          <p className="audio-preview__duration">{formatDuration(duration)}</p>
        )}
        {isListening ? (
          <div className={`wave${listening === null ? ' wave--waiting' : ''}`} aria-hidden="true">
            {WAVE.map((h, i) => (
              <span
                key={i}
                className={i < filled ? 'is-done' : i === filled ? 'is-current' : undefined}
                style={{ transform: `scaleY(${h})`, ['--i' as string]: i }}
              />
            ))}
          </div>
        ) : src ? (
          <audio className="audio-preview__player" src={src} controls preload="metadata" aria-label={`Putar ${name}`} />
        ) : (
          <p className="audio-preview__missing">Voice note asli tidak disimpan. Yang tersimpan hanya teksnya.</p>
        )}
      </figure>
    </ViewTransition>
  );
}
