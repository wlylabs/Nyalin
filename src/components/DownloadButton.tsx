import { Download } from 'lucide-react';
import { Button, type ButtonProps } from './Button';
import { useToast } from './Toast';
import { downloadText, textFileName } from '../lib/download';

export function DownloadButton({
  text,
  sourceName,
  label = 'Unduh',
  ...props
}: { text: string; sourceName: string; label?: string } & Omit<ButtonProps, 'onClick' | 'icon' | 'children'>) {
  const toast = useToast();
  return (
    <Button
      {...props}
      icon={<Download />}
      disabled={props.disabled || !text.trim()}
      aria-label={label === 'Unduh' ? 'Unduh teks (.txt)' : undefined}
      onClick={() => {
        const name = textFileName(sourceName);
        downloadText(text, name);
        toast.show({ message: `Teks diunduh sebagai ${name}.`, tone: 'success' });
      }}
    >
      {label}
    </Button>
  );
}
