import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react';
import { ACCEPT_ATTR } from '../lib/file';

interface FilePickerApi {
  openFiles: () => void;
  openCamera: () => void;
}

const FilePickerContext = createContext<FilePickerApi | null>(null);

/**
 * Satu pasang <input type="file"> untuk seluruh aplikasi, sehingga tombol mana pun
 * (hero, navbar, layar error) bisa membuka galeri atau kamera.
 * Kamera memakai `capture` — tidak ada permintaan izin dari aplikasi.
 */
export function FilePickerProvider({ onFile, children }: { onFile: (file: File) => void; children: ReactNode }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

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
      openFiles: () => fileRef.current?.click(),
      openCamera: () => cameraRef.current?.click(),
    }),
    [],
  );

  return (
    <FilePickerContext.Provider value={api}>
      {children}
      <input ref={fileRef} type="file" accept={ACCEPT_ATTR} onChange={handleChange} className="sr-only" tabIndex={-1} aria-hidden="true" />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
    </FilePickerContext.Provider>
  );
}

export function useFilePicker(): FilePickerApi {
  const api = useContext(FilePickerContext);
  if (!api) throw new Error('useFilePicker harus dipakai di dalam FilePickerProvider');
  return api;
}
