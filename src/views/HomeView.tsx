import { Upload } from 'lucide-react';
import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { CameraButton } from '../components/CameraButton';
import { useFilePicker } from '../components/FilePicker';
import { PrivacyNote } from '../components/PrivacyNote';
import { UploadZone } from '../components/UploadZone';
import { SelectionAlert } from './SelectionAlert';
import type { NyalinErrorCode } from '../services/ocr';

export function HomeView({ onFile, selectionError }: { onFile: (f: File) => void; selectionError: NyalinErrorCode | null }) {
  const { openFiles } = useFilePicker();
  return (
    <div className="page page--narrow stack home view-enter">
      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title" className="hero__title">
          Ubah gambar jadi tulisan.
        </h1>
        <p className="hero__subtitle">
          Kirim foto atau gambar tulisan. Nyalin akan mengubahnya menjadi teks yang bisa kamu edit dan salin.
        </p>
      </section>

      {selectionError && <SelectionAlert code={selectionError} />}
      <UploadZone onFile={onFile} id="upload" />
      <PrivacyNote />

      <ActionBar mobileOnly label="Pilih gambar">
        <CameraButton />
        <Button variant="primary" icon={<Upload />} onClick={openFiles}>
          Upload gambar
        </Button>
      </ActionBar>
    </div>
  );
}
