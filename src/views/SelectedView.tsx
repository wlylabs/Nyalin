import { useId } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { ActionBar } from '../components/ActionBar';
import { AudioPreview } from '../components/AudioPreview';
import { Button } from '../components/Button';
import { FileInfo } from '../components/FileInfo';
import { useFilePicker } from '../components/FilePicker';
import { ImagePreview } from '../components/ImagePreview';
import { PrivacyNote } from '../components/PrivacyNote';
import type { SelectedMedia } from '../state/nyalinReducer';
import type { NyalinErrorCode } from '../services/errors';
import type { SpeechLanguage } from '../services/transcribe';
import { SelectionAlert } from './SelectionAlert';
import { useViewFocus } from './useViewFocus';

const LANGUAGES: { value: SpeechLanguage; label: string }[] = [
  { value: 'id', label: 'Bahasa Indonesia' },
  { value: 'en', label: 'Bahasa Inggris' },
  { value: 'auto', label: 'Deteksi otomatis' },
];

export function SelectedView({
  media,
  language,
  selectionError,
  onStart,
  onLanguageChange,
  focusOnMount,
}: {
  media: SelectedMedia;
  language: SpeechLanguage;
  selectionError: NyalinErrorCode | null;
  onStart: () => void;
  onLanguageChange: (language: SpeechLanguage) => void;
  focusOnMount: boolean;
}) {
  const { openFiles } = useFilePicker();
  const titleRef = useViewFocus<HTMLHeadingElement>(focusOnMount);
  const selectId = useId();
  const isAudio = media.kind === 'audio';

  return (
    <div className="page page--narrow stack">
      <header>
        <h1 ref={titleRef} tabIndex={-1} className="view-title">
          {isAudio ? 'Cek voice note-nya dulu' : 'Cek gambarnya dulu'}
        </h1>
        <p className="view-subtitle">
          {isAudio ? 'Putar sebentar untuk memastikan suaranya benar, lalu mulai.' : 'Pastikan tulisan terlihat jelas, lalu mulai.'}
        </p>
      </header>

      {selectionError && <SelectionAlert code={selectionError} kind={media.kind} />}
      {isAudio ? (
        <AudioPreview src={media.url} name={media.name} duration={media.duration} />
      ) : (
        <ImagePreview src={media.url} alt={`Pratinjau ${media.name}`} />
      )}
      <FileInfo name={media.name} size={media.size} kind={media.kind} />

      {isAudio && (
        <div className="field">
          <label htmlFor={selectId} className="field__label">
            Bahasa dalam voice note
          </label>
          <select
            id={selectId}
            className="field__select"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as SpeechLanguage)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <PrivacyNote kind={media.kind} />

      <ActionBar label="Lanjutkan">
        <Button icon={<RefreshCw />} onClick={() => openFiles(media.kind)}>
          {isAudio ? 'Ganti audio' : 'Ganti gambar'}
        </Button>
        <Button variant="primary" icon={<ArrowRight />} onClick={onStart}>
          Mulai Nyalin
        </Button>
      </ActionBar>
    </div>
  );
}
