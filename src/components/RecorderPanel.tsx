import { Check, X } from 'lucide-react';
import { ActionBar } from './ActionBar';
import { Button } from './Button';
import { formatDuration, formatDurationLong, MAX_RECORDING_SECONDS } from '../lib/audio';
import type { VoiceRecorder } from '../state/useVoiceRecorder';
import './RecorderPanel.css';

/** Panel saat merekam: status, durasi, meter level, lalu "Selesai" atau "Batal". */
export function RecorderPanel({ recorder }: { recorder: VoiceRecorder }) {
  const { status, elapsed, levels, stop, cancel } = recorder;
  const requesting = status === 'requesting';
  const remaining = MAX_RECORDING_SECONDS - elapsed;

  return (
    <>
      <section className="recorder" aria-labelledby="recorder-title">
        <p id="recorder-title" className="recorder__status" role="status">
          <span className={`recorder__dot${requesting ? '' : ' is-live'}`} aria-hidden="true" />
          {requesting ? 'Menunggu izin mikrofon...' : 'Sedang merekam'}
        </p>
        <p className="recorder__time" role="timer" aria-label={`Durasi ${formatDurationLong(elapsed)}`}>
          {formatDuration(elapsed)}
        </p>
        <div className="recorder__meter" aria-hidden="true">
          {levels.map((level, i) => (
            <span key={i} style={{ transform: `scaleY(${Math.max(0.06, level)})` }} />
          ))}
        </div>
        <p className="recorder__hint">
          {remaining < 60
            ? `Rekaman berhenti otomatis dalam ${Math.max(0, Math.ceil(remaining))} detik.`
            : 'Bicara dengan jelas, dekat ke mikrofon. Tekan "Selesai" kalau sudah.'}
        </p>
      </section>
      <ActionBar label="Kontrol rekaman">
        <Button icon={<X />} onClick={cancel}>
          Batal
        </Button>
        <Button variant="primary" icon={<Check />} onClick={stop} disabled={requesting}>
          Selesai
        </Button>
      </ActionBar>
    </>
  );
}
