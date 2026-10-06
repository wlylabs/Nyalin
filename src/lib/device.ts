/**
 * Tombol "Ambil foto" memakai <input capture>, yang hanya membuka kamera di perangkat sentuh.
 * Di desktop atribut itu diabaikan, jadi tombolnya disembunyikan agar tidak membingungkan.
 * Tidak ada izin kamera yang diminta oleh aplikasi.
 */
export function supportsCameraCapture(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(pointer: coarse)').matches;
}
