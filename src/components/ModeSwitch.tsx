import { useRef } from 'react';
import { AudioLines, ImageIcon } from 'lucide-react';
import type { MediaKind } from '../lib/media';
import './ModeSwitch.css';

const OPTIONS: { value: MediaKind; label: string; Icon: typeof ImageIcon }[] = [
  { value: 'image', label: 'Gambar', Icon: ImageIcon },
  { value: 'audio', label: 'Voice note', Icon: AudioLines },
];

/**
 * Segmented control (pola Material 3 "segmented button") untuk memilih jenis masukan.
 * Diimplementasikan sebagai radio group: panah kiri/kanan berpindah pilihan.
 */
export function ModeSwitch({ value, onChange }: { value: MediaKind; onChange: (v: MediaKind) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  return (
    <div className="mode-switch" role="radiogroup" aria-label="Jenis yang mau disalin">
      {OPTIONS.map(({ value: v, label, Icon }, i) => {
        const checked = v === value;
        return (
          <button
            key={v}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className="mode-switch__option"
            onClick={() => onChange(v)}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
              e.preventDefault();
              const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + OPTIONS.length) % OPTIONS.length;
              onChange(OPTIONS[next].value);
              refs.current[next]?.focus();
            }}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
