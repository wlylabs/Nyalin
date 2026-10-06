import { useState, type InputHTMLAttributes } from 'react';
import { formatRupiah, parseRupiahInput } from '../lib/receipt';

export const rupiahField = {
  inputMode: 'numeric' as const,
  format: (v: number) => (v ? formatRupiah(v) : ''),
  parse: (s: string) => parseRupiahInput(s),
  placeholder: 'Rp0',
};

/**
 * Input angka yang menyimpan teks ketikan selama fokus (agar "1," atau "15.0" tidak langsung
 * dirapikan), lalu menampilkan format rapi saat ditinggalkan.
 */
export function NumberField({
  value,
  format,
  parse,
  onCommit,
  ...props
}: {
  value: number;
  format: (n: number) => string;
  parse: (s: string) => number | null;
  onCommit: (n: number) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      {...props}
      type="text"
      value={draft ?? format(value)}
      onFocus={(e) => {
        setDraft(format(value));
        props.onFocus?.(e);
        e.currentTarget.select();
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        const parsed = parse(e.target.value);
        if (parsed !== null) onCommit(parsed);
      }}
      onBlur={(e) => {
        setDraft(null);
        props.onBlur?.(e);
      }}
    />
  );
}
