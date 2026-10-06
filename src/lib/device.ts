import { useSyncExternalStore } from 'react';

/**
 * Tombol "Ambil foto" memakai <input capture>, yang hanya membuka kamera di perangkat sentuh.
 * Di desktop atribut itu diabaikan, jadi tombolnya disembunyikan agar tidak membingungkan.
 * Tidak ada izin kamera yang diminta oleh aplikasi.
 */
export function supportsCameraCapture(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

/** Perekaman suara butuh getUserMedia + MediaRecorder (tersedia di browser modern, HTTPS). */
export function supportsVoiceRecording(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    typeof window.MediaRecorder !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

const noopSubscribe = () => () => {};

/**
 * Deteksi kemampuan browser yang aman untuk SSR: server & hidrasi awal memakai `false`,
 * lalu nilai asli dipakai setelahnya — tanpa hydration mismatch.
 */
export function useBrowserSupport(check: () => boolean): boolean {
  return useSyncExternalStore(noopSubscribe, check, () => false);
}
