import { useEffect, useState, type CSSProperties } from 'react';
import { Mic, PencilLine, Upload } from 'lucide-react';
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

/** Pembukaan bertahap hanya saat beranda pertama kali tampil; kembali ke beranda memakai View Transition. */
let introPlayed = false;
type RevealProps = { className?: string; style?: CSSProperties };
const reveal = (i: number): RevealProps => ({ className: 'reveal', style: { '--reveal-index': i } as CSSProperties });

export function HomeView({
  onFile,
  selectionError,
}: {
  onFile: (f: File) => void;
  selectionError: NyalinErrorCode | null;
}) {
  const { openFiles } = useFilePicker();
  const { inputMode, setInputMode, selectFile, reportError, startManual } = useNyalin();
  const canRecord = useBrowserSupport(supportsVoiceRecording);
  const recorder = useVoiceRecorder({
    onComplete: (file, duration) => selectFile(file, { duration }),
    onError: reportError,
  });
  const recording = recorder.status !== 'idle';
  const [intro] = useState(() => !introPlayed);
  useEffect(() => {
    introPlayed = true;
  }, []);
  const r = (i: number): RevealProps => (intro ? reveal(i) : {});

  return (
    <div className="page page--narrow stack home">
      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title" className={['hero__title', r(0).className].filter(Boolean).join(' ')} style={r(0).style}>
          Foto struk atau sebut belanjaan, langsung jadi nota.
        </h1>
        <p className={['hero__subtitle', r(1).className].filter(Boolean).join(' ')} style={r(1).style}>
          Nyalin menyusun jumlah, nama barang, harga, dan total jadi nota digital yang rapi — siap dikirim ke WhatsApp,
          disimpan sebagai gambar, atau dicetak.
        </p>
      </section>

      {!recording && (
        <div {...r(2)}>
          <ModeSwitch value={inputMode} onChange={setInputMode} />
        </div>
      )}
      {selectionError && <SelectionAlert code={selectionError} kind={inputMode} />}

      {recording ? (
        <RecorderPanel recorder={recorder} />
      ) : (
        <>
          <div {...r(3)}>
            <UploadZone
              kind={inputMode}
              onFile={onFile}
              onRecord={canRecord ? recorder.start : undefined}
              id="upload"
            />
          </div>
          <div {...r(4)} className={['home-manual', r(4).className].filter(Boolean).join(' ')}>
            <span>Tidak ada foto atau rekaman?</span>
            <Button size="sm" icon={<PencilLine />} onClick={startManual}>
              Buat nota manual
            </Button>
          </div>
          <div {...r(5)}>
            <PrivacyNote kind={inputMode} />
          </div>
          <ActionBar mobileOnly label="Pilih file">
            {inputMode === 'image' ? (
              <>
                <CameraButton />
                <Button variant="primary" icon={<Upload />} onClick={() => openFiles('image')}>
                  Upload foto
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
