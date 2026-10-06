import './Spinner.css';

/** Indikator kecil untuk tombol yang sedang memproses. Bukan loader halaman. */
export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}
