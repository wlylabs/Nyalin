/** Membuat nama file .txt dari nama gambar asal. */
export function textFileName(imageName: string): string {
  const base = imageName.replace(/\.[^.]+$/, '').trim() || 'gambar';
  const safe = base
    .normalize('NFKD')
    .replace(/[^\w\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
  return `nyalin-${safe || 'gambar'}.txt`;
}

export function downloadText(text: string, fileName: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Beri waktu browser memulai unduhan sebelum URL dilepas.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
