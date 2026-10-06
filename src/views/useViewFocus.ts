import { useEffect, useRef } from 'react';

/**
 * Memindahkan fokus ke judul tampilan baru setelah alur berpindah,
 * supaya pengguna keyboard & pembaca layar tahu konteks berubah.
 */
export function useViewFocus<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (enabled) ref.current?.focus({ preventScroll: true });
  }, [enabled]);
  return ref;
}
