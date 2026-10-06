import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button, type ButtonProps } from './Button';
import { useToast } from './Toast';
import { copyText } from '../lib/clipboard';

/** Menyalin teks; label & ikon berubah jadi "Tersalin" beberapa detik, plus toast. */
export function CopyButton({
  text,
  label = 'Salin teks',
  successMessage = 'Teks berhasil disalin.',
  ...props
}: { text: string; label?: string; successMessage?: string } & Omit<ButtonProps, 'onClick' | 'icon' | 'children'>) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);
  // Teks berubah → status "Tersalin" tidak lagi berlaku.
  useEffect(() => setCopied(false), [text]);

  async function handleCopy() {
    try {
      await copyText(text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 3000);
      toast.show({ message: successMessage, tone: 'success' });
    } catch {
      toast.show({ message: 'Teks belum bisa disalin. Pilih teks lalu salin manual.', tone: 'error' });
    }
  }

  return (
    <Button
      {...props}
      icon={copied ? <Check /> : <Copy />}
      onClick={handleCopy}
      disabled={props.disabled || !text.trim()}
      data-state={copied ? 'success' : undefined}
    >
      {copied ? 'Tersalin' : label}
    </Button>
  );
}
