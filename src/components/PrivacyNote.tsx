import { ShieldCheck } from 'lucide-react';
import { ocrProvider } from '../services/ocr';
import { transcribeProvider } from '../services/transcribe';
import type { MediaKind } from '../lib/media';
import './PrivacyNote.css';

/** Penjelasan singkat kapan dan di mana file diproses. */
export function PrivacyNote({ kind = 'image' }: { kind?: MediaKind }) {
  let message: string;
  if (kind === 'audio') {
    message = transcribeProvider.processesOnDevice
      ? 'Suara diproses langsung di perangkatmu dan tidak diunggah ke server. Pemakaian pertama mengunduh model pengenal suara sekali saja. '
      : 'Suara dikirim ke server hanya saat kamu menekan "Jadikan nota", lalu tidak disimpan. ';
  } else {
    message = ocrProvider.processesOnDevice
      ? 'Foto dibaca langsung di perangkatmu dan tidak diunggah ke server. '
      : 'Foto dikirim ke server hanya saat kamu menekan "Jadikan nota", lalu tidak disimpan. ';
  }
  return (
    <p className="privacy-note">
      <ShieldCheck aria-hidden="true" />
      <span>
        {message}
        Nota hanya tersimpan di browser ini.
      </span>
    </p>
  );
}
