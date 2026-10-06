import type { ReactNode } from 'react';
import { CircleAlert, TriangleAlert } from 'lucide-react';
import './InlineAlert.css';

/** Pesan di dalam alur (bukan halaman penuh). Selalu ikon + teks, tidak hanya warna. */
export function InlineAlert({
  tone = 'error',
  title,
  children,
}: {
  tone?: 'error' | 'warning';
  title: string;
  children?: ReactNode;
}) {
  const Icon = tone === 'error' ? CircleAlert : TriangleAlert;
  return (
    <div className={`inline-alert inline-alert--${tone}`} role={tone === 'error' ? 'alert' : 'note'}>
      <Icon className="inline-alert__icon" aria-hidden="true" />
      <div className="inline-alert__content">
        <p className="inline-alert__title">{title}</p>
        {children && <div className="inline-alert__body">{children}</div>}
      </div>
    </div>
  );
}
