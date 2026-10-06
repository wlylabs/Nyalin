import { ViewTransition, useState } from 'react';
import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import './ImagePreview.css';

/** Nama shared element pratinjau media — sama untuk gambar & audio karena tidak pernah tampil bersamaan. */
export const MEDIA_TRANSITION_NAME = 'nyalin-media';

/**
 * Pratinjau gambar. Tap/klik membuka tampilan penuh dengan satu pilihan zoom
 * (sesuai layar ↔ ukuran asli) — sengaja sederhana.
 * Saat `scanning`, garis pindai bergerak mengikuti progres OCR yang sebenarnya.
 */
export function ImagePreview({
  src,
  alt,
  size = 'md',
  dimmed = false,
  scanning,
}: {
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  dimmed?: boolean;
  /** Progres 0–1, `null` = belum terukur (garis bergerak bolak-balik), `undefined` = tidak memindai. */
  scanning?: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  return (
    <>
      <ViewTransition name={MEDIA_TRANSITION_NAME} share="vt-morph">
        <figure className={`image-preview image-preview--${size}${dimmed ? ' is-dimmed' : ''}`}>
          <img src={src} alt={alt} />
          {scanning !== undefined && (
            <span
              className={`scan${scanning === null ? ' scan--sweep' : ''}`}
              style={scanning === null ? undefined : { top: `${Math.round(Math.min(1, scanning) * 100)}%` }}
              aria-hidden="true"
            />
          )}
          {!dimmed && scanning === undefined && (
            <button type="button" className="image-preview__expand" onClick={() => setOpen(true)}>
              <Maximize2 aria-hidden="true" />
              <span>Lihat gambar</span>
            </button>
          )}
        </figure>
      </ViewTransition>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setZoomed(false);
        }}
        title="Gambar asli"
        size="lg"
        footer={
          <Button icon={zoomed ? <ZoomOut /> : <ZoomIn />} onClick={() => setZoomed((z) => !z)} aria-pressed={zoomed}>
            {zoomed ? 'Sesuaikan layar' : 'Perbesar'}
          </Button>
        }
      >
        <div
          className={`image-viewer${zoomed ? ' is-zoomed' : ''}`}
          tabIndex={0}
          aria-label="Gambar asli, bisa digeser saat diperbesar"
        >
          <img src={src} alt={alt} onClick={() => setZoomed((z) => !z)} />
        </div>
      </Modal>
    </>
  );
}
