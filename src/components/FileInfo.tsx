import type { ReactNode } from 'react';
import { ImageIcon } from 'lucide-react';
import { displayFileName, formatBytes } from '../lib/file';
import './FileInfo.css';

export function FileInfo({ name, size, action }: { name: string; size: number | null; action?: ReactNode }) {
  return (
    <div className="file-info">
      <span className="file-info__icon" aria-hidden="true">
        <ImageIcon />
      </span>
      <div className="file-info__text">
        <p className="file-info__name" title={name}>
          {displayFileName(name)}
        </p>
        {size !== null && <p className="file-info__size">{formatBytes(size)}</p>}
      </div>
      {action}
    </div>
  );
}
