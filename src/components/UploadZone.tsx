import { useRef, useState, type DragEvent } from 'react';
import { AudioLines, ImageUp, Mic, Upload } from 'lucide-react';
import { Button } from './Button';
import { CameraButton } from './CameraButton';
import { EmptyState } from './EmptyState';
import { useFilePicker } from './FilePicker';
import { MAX_FILE_SIZE_LABEL } from '../lib/file';
import { MAX_AUDIO_SIZE_LABEL } from '../lib/audio';
import type { MediaKind } from '../lib/media';
import './UploadZone.css';

const COPY = {
  image: {
    title: 'Belum ada gambar',
    description: 'Upload foto atau gambar untuk mulai menyalin tulisan.',
    upload: 'Upload gambar',
    formats: `JPG, PNG, WEBP hingga ${MAX_FILE_SIZE_LABEL}.`,
  },
  audio: {
    title: 'Belum ada voice note',
    description: 'Upload voice note (misalnya dari WhatsApp) atau rekam langsung.',
    upload: 'Upload audio',
    formats: `OPUS, OGG, MP3, M4A, WAV, WEBM hingga ${MAX_AUDIO_SIZE_LABEL}.`,
  },
};

/**
 * Area utama untuk memasukkan file: klik/tap, drag & drop (desktop), atau tempel gambar.
 * Gambar dan audio sama-sama diterima saat di-drop; jenisnya dideteksi otomatis.
 * Tombol di dalam area hanya tampil di layar besar; di ponsel tombol ada di action bar bawah.
 */
export function UploadZone({
  kind,
  onFile,
  onRecord,
  id,
}: {
  kind: MediaKind;
  onFile: (file: File) => void;
  onRecord?: () => void;
  id?: string;
}) {
  const { openFiles } = useFilePicker();
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const copy = COPY[kind];

  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes('Files');

  return (
    <div
      id={id}
      className={`upload-zone${dragging ? ' is-dragging' : ''}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        openFiles(kind);
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
        icon={kind === 'audio' ? <AudioLines /> : <ImageUp />}
        title={dragging ? 'Lepaskan untuk memakai file ini' : copy.title}
        description={copy.description}
      >
        <div className="upload-zone__actions">
          <Button variant="primary" icon={<Upload />} onClick={() => openFiles(kind)}>
            {copy.upload}
          </Button>
          {kind === 'image' ? (
            <CameraButton />
          ) : (
            onRecord && (
              <Button icon={<Mic />} onClick={onRecord}>
                Rekam suara
              </Button>
            )
          )}
        </div>
      </EmptyState>
      <p className="upload-zone__hint">
        <span className="upload-zone__drop-hint">
          {kind === 'image'
            ? 'Tarik & lepas gambar ke sini, atau tempel dengan Ctrl+V. '
            : 'Tarik & lepas file audio ke sini. '}
        </span>
        {copy.formats}
      </p>
    </div>
  );
}
