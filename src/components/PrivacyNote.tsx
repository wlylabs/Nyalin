import { ShieldCheck } from 'lucide-react';
import { ocrProvider } from '../services/ocr';
import './PrivacyNote.css';

/** Penjelasan singkat kapan dan di mana gambar diproses. */
export function PrivacyNote() {
  return (
    <p className="privacy-note">
      <ShieldCheck aria-hidden="true" />
      <span>
        {ocrProvider.processesOnDevice
          ? 'Gambar dibaca langsung di perangkatmu dan tidak diunggah ke server. '
          : 'Gambar dikirim ke server hanya saat kamu menekan "Mulai Nyalin", lalu tidak disimpan. '}
        Riwayat hanya tersimpan di browser ini.
      </span>
    </p>
  );
}
