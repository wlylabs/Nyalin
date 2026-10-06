import { useRef, type ComponentType, type SVGProps } from 'react';
import { AudioLines, ImageIcon } from 'lucide-react';
import type { MediaKind } from '../lib/media';
import './ModeSwitch.css';

export interface SwitchOption<T extends string> {
  value: T;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const MEDIA_OPTIONS: SwitchOption<MediaKind>[] = [
  { value: 'image', label: 'Foto struk', Icon: ImageIcon },
  { value: 'audio', label: 'Voice note', Icon: AudioLines },
];

/** Pilihan jenis masukan di beranda: gambar atau voice note. */
export function ModeSwitch({ value, onChange }: { value: MediaKind; onChange: (v: MediaKind) => void }) {
  return <SegmentedSwitch options={MEDIA_OPTIONS} value={value} onChange={onChange} label="Sumber nota" />;
}

/**
 * Segmented control (pola Material 3 "segmented button") dua pilihan.
 * Diimplementasikan sebagai radio group: panah kiri/kanan berpindah pilihan.
 */
export function SegmentedSwitch<T extends string>({
  options: OPTIONS,
  value,
  onChange,
  label,
  className,
}: {
  options: SwitchOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  return (
    <div
      className={['mode-switch', className].filter(Boolean).join(' ')}
      role="radiogroup"
      aria-label={label}
      style={{ ['--active' as string]: OPTIONS.findIndex((o) => o.value === value) }}
    >
      {/* Penanda pilihan yang bergeser — pilihan juga ditandai aria-checked & warna teks. */}
      <span className="mode-switch__thumb" aria-hidden="true" />
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
