import { PencilLine, RotateCcw } from 'lucide-react';
import { Button } from './Button';
import { CopyButton } from './CopyButton';
import { DownloadButton } from './DownloadButton';
import './ResultToolbar.css';

/**
 * Aksi hasil. Di ponsel "Salin teks" pindah ke action bar bawah,
 * jadi toolbar ini berisi aksi pendukung saja.
 */
export function ResultToolbar({
  text,
  sourceName,
  onEdit,
  onAgain,
}: {
  text: string;
  sourceName: string;
  onEdit: () => void;
  onAgain: () => void;
}) {
  return (
    <div className="result-toolbar" role="toolbar" aria-label="Aksi hasil">
      <CopyButton text={text} variant="primary" className="result-toolbar__copy" />
      <DownloadButton text={text} sourceName={sourceName} size="sm" variant="ghost" />
      <Button icon={<PencilLine />} size="sm" variant="ghost" onClick={onEdit}>
        Edit
      </Button>
      <Button icon={<RotateCcw />} size="sm" variant="ghost" onClick={onAgain}>
        Nyalin lagi
      </Button>
    </div>
  );
}
