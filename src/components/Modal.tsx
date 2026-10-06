import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';
import './Modal.css';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Sembunyikan judul secara visual (tetap dibaca pembaca layar). */
  hideTitle?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'lg';
}

/**
 * Modal berbasis <dialog> native: fokus terkunci, Esc menutup, dan elemen di belakangnya inert.
 * Di layar kecil tampil sebagai bottom sheet agar mudah dijangkau satu tangan.
 */
export function Modal({ open, onClose, title, hideTitle, children, footer, size = 'sm' }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`modal modal--${size}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Klik di backdrop menutup modal.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal__panel">
        <header className="modal__header">
          <h2 id={titleId} className={hideTitle ? 'sr-only' : 'modal__title'}>
            {title}
          </h2>
          <IconButton label="Tutup" icon={<X />} onClick={onClose} className="modal__close" />
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </dialog>
  );
}
