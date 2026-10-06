'use client';

import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react';
import { ACCEPT_ATTR } from '../lib/file';
import { AUDIO_ACCEPT_ATTR } from '../lib/audio';
import type { MediaKind } from '../lib/media';

interface FilePickerApi {
  openFiles: (kind?: MediaKind) => void;
  openCamera: () => void;
}

const FilePickerContext = createContext<FilePickerApi | null>(null);

/**
 * Input file untuk seluruh aplikasi (gambar, kamera, audio), sehingga tombol mana pun
 * bisa membuka pemilih yang tepat. Kamera memakai `capture` — tanpa permintaan izin dari aplikasi.
 */
export function FilePickerProvider({ onFile, children }: { onFile: (file: File) => void; children: ReactNode }) {
  const imageRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Reset agar memilih file yang sama dua kali tetap memicu change.
      e.target.value = '';
      if (file) onFile(file);
    },
    [onFile],
  );

  const api = useMemo<FilePickerApi>(
    () => ({
      openFiles: (kind = 'image') => (kind === 'audio' ? audioRef : imageRef).current?.click(),
      openCamera: () => cameraRef.current?.click(),
    }),
    [],
  );

  const inputProps = { onChange: handleChange, className: 'sr-only', tabIndex: -1, 'aria-hidden': true } as const;

  return (
    <FilePickerContext.Provider value={api}>
      {children}
      <input ref={imageRef} type="file" accept={ACCEPT_ATTR} {...inputProps} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" {...inputProps} />
      <input ref={audioRef} type="file" accept={AUDIO_ACCEPT_ATTR} {...inputProps} />
    </FilePickerContext.Provider>
  );
}

export function useFilePicker(): FilePickerApi {
  const api = useContext(FilePickerContext);
  if (!api) throw new Error('useFilePicker harus dipakai di dalam FilePickerProvider');
  return api;
}
