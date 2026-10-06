import { useState } from 'react';
import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import './ImagePreview.css';

/**
 * Pratinjau gambar. Tap/klik membuka tampilan penuh dengan satu pilihan zoom
 * (sesuai layar ↔ ukuran asli) — sengaja sederhana.
 */
export function ImagePreview({
  src,
  alt,
  size = 'md',
  dimmed = false,
}: {
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  dimmed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  return (
    <>
      <figure className={`image-preview image-preview--${size}${dimmed ? ' is-dimmed' : ''}`}>
        <img src={src} alt={alt} />
        {!dimmed && (
          <button type="button" className="image-preview__expand" onClick={() => setOpen(true)}>
            <Maximize2 aria-hidden="true" />
            <span>Lihat gambar</span>
          </button>
        )}
      </figure>

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
        <div className={`image-viewer${zoomed ? ' is-zoomed' : ''}`} tabIndex={0} aria-label="Gambar asli, bisa digeser saat diperbesar">
          <img src={src} alt={alt} onClick={() => setZoomed((z) => !z)} />
        </div>
      </Modal>
    </>
  );
}
