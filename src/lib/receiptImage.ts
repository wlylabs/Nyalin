import {
  formatQty,
  formatReceiptDate,
  formatReceiptText,
  formatRupiah,
  itemSubtotal,
  normalizeReceipt,
  receiptChange,
  receiptGrandTotal,
  receiptTotal,
  type Receipt,
} from './receipt';

/**
 * Nota sebagai gambar PNG bergaya struk — untuk dikirim ke WhatsApp atau disimpan di galeri.
 * Digambar langsung di <canvas> (tanpa library), lebar tetap seperti kertas struk.
 */
const WIDTH = 640;
const PAD = 40;
const INNER = WIDTH - PAD * 2;
const FONT = '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", system-ui, sans-serif';
const INK = '#17201e';
const MUTED = '#4f5b58';
const BRAND = '#0a5a4e';

type Align = 'left' | 'center' | 'right';

/** Menata isi nota; `draw` false hanya mengukur tinggi. */
function layout(ctx: CanvasRenderingContext2D, input: Receipt, draw: boolean): number {
  const receipt = normalizeReceipt(input);
  const items = receipt.items.filter((i) => i.name.trim() || i.price > 0);
  let y = PAD;

  const font = (size: number, weight = 400) => {
    ctx.font = `${weight} ${size}px ${FONT}`;
  };

  /** Memecah teks agar muat dalam lebar tertentu. */
  const wrap = (text: string, width: number): string[] => {
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= width || !line) line = test;
      else (lines.push(line), (line = word));
    }
    if (line) lines.push(line);
    return lines;
  };

  const text = (value: string, size: number, opts: { weight?: number; color?: string; align?: Align } = {}) => {
    font(size, opts.weight);
    const lineHeight = Math.round(size * 1.4);
    for (const line of wrap(value, INNER)) {
      if (draw) {
        ctx.fillStyle = opts.color ?? INK;
        ctx.textAlign = opts.align ?? 'left';
        const x = opts.align === 'center' ? WIDTH / 2 : opts.align === 'right' ? WIDTH - PAD : PAD;
        ctx.fillText(line, x, y + size);
      }
      y += lineHeight;
    }
  };

  /** Satu baris: label kiri, nilai kanan. */
  const row = (label: string, value: string, size: number, opts: { weight?: number; color?: string } = {}) => {
    font(size, opts.weight);
    const valueWidth = ctx.measureText(value).width;
    const labels = wrap(label, INNER - valueWidth - 16);
    if (draw) {
      ctx.fillStyle = opts.color ?? INK;
      ctx.textAlign = 'left';
      labels.forEach((l, i) => ctx.fillText(l, PAD, y + size + i * Math.round(size * 1.4)));
      ctx.textAlign = 'right';
      ctx.fillText(value, WIDTH - PAD, y + size);
    }
    y += labels.length * Math.round(size * 1.4);
  };

  const divider = (gap = 18) => {
    y += gap;
    if (draw) {
      ctx.strokeStyle = '#c4ccc9';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(PAD, y);
      ctx.lineTo(WIDTH - PAD, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    y += gap;
  };

  text(receipt.title.trim() || 'NOTA', 34, { weight: 700, align: 'center' });
  if (receipt.address.trim()) text(receipt.address.trim(), 21, { color: MUTED, align: 'center' });
  y += 6;
  const meta = [receipt.number.trim() && `No. ${receipt.number.trim()}`, formatReceiptDate(receipt.date)];
  text(meta.filter(Boolean).join('  ·  '), 21, { color: MUTED, align: 'center' });
  if (receipt.customer.trim()) text(`Kepada: ${receipt.customer.trim()}`, 21, { color: MUTED, align: 'center' });
  divider();

  if (items.length === 0) text('Belum ada barang', 24, { color: MUTED, align: 'center' });
  items.forEach((item, index) => {
    if (index > 0) y += 12;
    text(item.name.trim() || 'Barang', 25, { weight: 600 });
    row(`${formatQty(item.qty)} × ${formatRupiah(item.price)}`, formatRupiah(itemSubtotal(item)), 23, {
      color: MUTED,
    });
  });
  divider();

  if (receipt.discount > 0) {
    row('Subtotal', formatRupiah(receiptTotal(items)), 23);
    y += 6;
    row('Diskon', `-${formatRupiah(receipt.discount)}`, 23);
    y += 10;
  }
  row(`TOTAL (${items.length} barang)`, formatRupiah(receiptGrandTotal({ ...receipt, items })), 30, {
    weight: 700,
    color: BRAND,
  });
  const change = receiptChange({ ...receipt, items });
  if (change !== null) {
    y += 10;
    row('Bayar', formatRupiah(receipt.paid), 23);
    y += 6;
    row(change >= 0 ? 'Kembali' : 'Kurang', formatRupiah(Math.abs(change)), 23, { weight: 600 });
  }
  if (receipt.note.trim()) {
    divider();
    text(receipt.note.trim(), 21, { color: MUTED });
  }
  divider();
  text('Terima kasih', 23, { weight: 600, align: 'center' });
  text('Dibuat dengan Nyalin', 18, { color: MUTED, align: 'center' });
  return y + PAD;
}

export async function renderReceiptImage(receipt: Receipt): Promise<Blob> {
  await document.fonts?.ready;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas tidak tersedia');
  canvas.width = WIDTH;
  canvas.height = Math.ceil(layout(ctx, receipt, false));
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  layout(ctx, receipt, true);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Gagal membuat gambar'))), 'image/png'),
  );
}

/** "nota-0007-toko-maju.png" */
export function receiptFileName(receipt: Receipt, ext = 'png'): string {
  const { number, title } = normalizeReceipt(receipt);
  const slug = [number.trim(), title.trim()]
    .filter(Boolean)
    .join(' ')
    .normalize('NFKD')
    .replace(/[^\w\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 48);
  return `nota${slug ? `-${slug}` : ''}.${ext}`;
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadReceiptImage(receipt: Receipt): Promise<string> {
  const name = receiptFileName(receipt);
  download(await renderReceiptImage(receipt), name);
  return name;
}

export type ShareOutcome = 'shared' | 'shared-text' | 'downloaded' | 'cancelled';

/**
 * Bagikan nota lewat menu Bagikan perangkat (WhatsApp, Telegram, dll.):
 * gambar + teks bila didukung, teks saja bila tidak, dan unduh gambar sebagai cadangan terakhir.
 */
export async function shareReceipt(receipt: Receipt): Promise<ShareOutcome> {
  const text = formatReceiptText(receipt);
  const title = normalizeReceipt(receipt).title.trim() || 'Nota';
  try {
    if (typeof navigator.share === 'function') {
      const file = new File([await renderReceiptImage(receipt)], receiptFileName(receipt), { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title, text });
        return 'shared';
      }
      await navigator.share({ title, text });
      return 'shared-text';
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    throw error;
  }
  await downloadReceiptImage(receipt);
  return 'downloaded';
}
