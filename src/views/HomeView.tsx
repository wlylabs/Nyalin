import { Mic, Upload } from 'lucide-react';
import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { CameraButton } from '../components/CameraButton';
import { useFilePicker } from '../components/FilePicker';
import { ModeSwitch } from '../components/ModeSwitch';
import { PrivacyNote } from '../components/PrivacyNote';
import { RecorderPanel } from '../components/RecorderPanel';
import { UploadZone } from '../components/UploadZone';
import { SelectionAlert } from './SelectionAlert';
import { supportsVoiceRecording, useBrowserSupport } from '../lib/device';
import { useNyalin } from '../state/NyalinProvider';
import { useVoiceRecorder } from '../state/useVoiceRecorder';
import type { NyalinErrorCode } from '../services/errors';

export function HomeView({ onFile, selectionError }: { onFile: (f: File) => void; selectionError: NyalinErrorCode | null }) {
  const { openFiles } = useFilePicker();
  const { inputMode, setInputMode, selectFile, reportError } = useNyalin();
  const canRecord = useBrowserSupport(supportsVoiceRecording);
  const recorder = useVoiceRecorder({
    onComplete: (file, duration) => selectFile(file, { duration }),
    onError: reportError,
  });
  const recording = recorder.status !== 'idle';

  return (
    <div className="page page--narrow stack home view-enter">
      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title" className="hero__title">
          Ubah gambar dan suara jadi tulisan.
        </h1>
        <p className="hero__subtitle">
          Kirim foto, gambar tulisan, atau voice note. Nyalin akan mengubahnya menjadi teks yang bisa kamu edit dan
          salin.
        </p>
      </section>

      {!recording && <ModeSwitch value={inputMode} onChange={setInputMode} />}
      {selectionError && <SelectionAlert code={selectionError} kind={inputMode} />}

      {recording ? (
        <RecorderPanel recorder={recorder} />
      ) : (
        <>
          <UploadZone
            kind={inputMode}
            onFile={onFile}
            onRecord={canRecord ? recorder.start : undefined}
            id="upload"
          />
          <PrivacyNote kind={inputMode} />
          <ActionBar mobileOnly label="Pilih file">
            {inputMode === 'image' ? (
              <>
                <CameraButton />
                <Button variant="primary" icon={<Upload />} onClick={() => openFiles('image')}>
                  Upload gambar
                </Button>
              </>
            ) : (
              <>
                <Button icon={<Upload />} onClick={() => openFiles('audio')}>
                  Upload audio
                </Button>
                {canRecord && (
                  <Button variant="primary" icon={<Mic />} onClick={recorder.start}>
                    Rekam suara
                  </Button>
                )}
              </>
            )}
          </ActionBar>
        </>
      )}
    </div>
  );
}
