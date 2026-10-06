import { RotateCcw } from 'lucide-react';
import { Button } from './Button';
import { CopyButton } from './CopyButton';
import { DownloadButton } from './DownloadButton';
import './ResultToolbar.css';

/**
 * Aksi hasil. Di ponsel "Salin nota" pindah ke action bar bawah,
 * jadi toolbar ini berisi aksi pendukung saja.
 */
export function ResultToolbar({
  text,
  sourceName,
  copyLabel,
  copySuccess,
  onAgain,
}: {
  text: string;
  sourceName: string;
  copyLabel?: string;
  copySuccess?: string;
  onAgain: () => void;
}) {
  return (
    <div className="result-toolbar" role="toolbar" aria-label="Aksi hasil">
      <CopyButton
        text={text}
        label={copyLabel}
        successMessage={copySuccess}
        variant="primary"
        className="result-toolbar__copy"
      />
      <DownloadButton text={text} sourceName={sourceName} size="sm" variant="ghost" />
      <Button icon={<RotateCcw />} size="sm" variant="ghost" onClick={onAgain}>
        Nyalin lagi
      </Button>
    </div>
  );
}
