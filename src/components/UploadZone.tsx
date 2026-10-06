import { useRef, useState, type DragEvent } from 'react';
import { ImageUp, Upload } from 'lucide-react';
import { Button } from './Button';
import { CameraButton } from './CameraButton';
import { EmptyState } from './EmptyState';
import { useFilePicker } from './FilePicker';
import { MAX_FILE_SIZE_LABEL } from '../lib/file';
import './UploadZone.css';

/**
 * Area utama untuk memasukkan gambar: klik/tap, drag & drop (desktop), atau tempel dari clipboard.
 * Tombol di dalam area hanya tampil di layar besar; di ponsel tombol ada di action bar bawah.
 */
export function UploadZone({ onFile, id }: { onFile: (file: File) => void; id?: string }) {
  const { openFiles } = useFilePicker();
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);

  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes('Files');

  return (
    <div
      id={id}
      className={`upload-zone${dragging ? ' is-dragging' : ''}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        openFiles();
      }}
      onDragEnter={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        depth.current += 1;
        setDragging(true);
      }}
      onDragOver={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
    >
      <EmptyState
        icon={<ImageUp />}
        title={dragging ? 'Lepaskan untuk memakai gambar ini' : 'Belum ada gambar'}
        description="Upload foto atau gambar untuk mulai menyalin tulisan."
      >
        <div className="upload-zone__actions">
          <Button variant="primary" icon={<Upload />} onClick={openFiles}>
            Upload gambar
          </Button>
          <CameraButton />
        </div>
      </EmptyState>
      <p className="upload-zone__hint">
        <span className="upload-zone__drop-hint">Tarik & lepas gambar ke sini, atau tempel dengan Ctrl+V. </span>
        JPG, PNG, WEBP hingga {MAX_FILE_SIZE_LABEL}.
      </p>
    </div>
  );
}
