import type { ReactNode } from 'react';
import { CircleAlert, FileWarning, ScanText, WifiOff } from 'lucide-react';
import type { NyalinErrorCode } from '../services/ocr';
import { ERROR_COPY } from '../content/errors';
import './ErrorState.css';

const ICONS: Partial<Record<NyalinErrorCode, typeof CircleAlert>> = {
  network: WifiOff,
  unsupported: FileWarning,
  'too-large': FileWarning,
  'empty-file': FileWarning,
  unreadable: FileWarning,
  blurry: ScanText,
  'empty-result': ScanText,
};

/** Error halaman penuh setelah proses: apa yang terjadi, kenapa, dan apa yang bisa dilakukan. */
export function ErrorState({ code, children }: { code: NyalinErrorCode; children?: ReactNode }) {
  const copy = ERROR_COPY[code];
  const Icon = ICONS[code] ?? CircleAlert;
  return (
    <section className="error-state" aria-labelledby="error-title">
      <span className="error-state__icon" aria-hidden="true">
        <Icon />
      </span>
      <h1 id="error-title" className="error-state__title" tabIndex={-1}>
        {copy.title}
      </h1>
      <p className="error-state__description">{copy.description}</p>
      {copy.tips && (
        <ul className="error-state__tips">
          {copy.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      )}
      {children}
    </section>
  );
}
