import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  formatQty,
  formatReceiptDate,
  formatRupiah,
  itemSubtotal,
  normalizeReceipt,
  receiptChange,
  receiptGrandTotal,
  receiptTotal,
  type Receipt,
} from '../lib/receipt';
import './ReceiptPaper.css';

/**
 * Versi cetak nota (kertas A4/struk 58–80 mm atau "Simpan sebagai PDF").
 * Tidak tampil di layar; saat mencetak hanya elemen ini yang terlihat.
 */
export function ReceiptPaper({ receipt: input }: { receipt: Receipt }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const receipt = normalizeReceipt(input);
  const items = receipt.items.filter((i) => i.name.trim() || i.price > 0);
  const full = { ...receipt, items };
  const change = receiptChange(full);

  return createPortal(
    <div className="print-root" aria-hidden="true">
      <article className="receipt-paper">
        <header className="receipt-paper__head">
          <h2>{receipt.title.trim() || 'NOTA'}</h2>
          {receipt.address.trim() && <p>{receipt.address.trim()}</p>}
          <p>
            {receipt.number.trim() && `No. ${receipt.number.trim()} · `}
            {formatReceiptDate(receipt.date)}
          </p>
          {receipt.customer.trim() && <p>Kepada: {receipt.customer.trim()}</p>}
        </header>
        <table>
          <thead>
            <tr>
              <th>Jml</th>
              <th>Nama barang</th>
              <th>Harga</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{formatQty(item.qty)}</td>
                <td>{item.name.trim() || 'Barang'}</td>
                <td>{formatRupiah(item.price)}</td>
                <td>{formatRupiah(itemSubtotal(item))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="receipt-paper__sum">
          {receipt.discount > 0 && (
            <>
              <dt>Subtotal</dt>
              <dd>{formatRupiah(receiptTotal(items))}</dd>
              <dt>Diskon</dt>
              <dd>-{formatRupiah(receipt.discount)}</dd>
            </>
          )}
          <dt className="receipt-paper__total">TOTAL</dt>
          <dd className="receipt-paper__total">{formatRupiah(receiptGrandTotal(full))}</dd>
          {change !== null && (
            <>
              <dt>Bayar</dt>
              <dd>{formatRupiah(receipt.paid)}</dd>
              <dt>{change >= 0 ? 'Kembali' : 'Kurang'}</dt>
              <dd>{formatRupiah(Math.abs(change))}</dd>
            </>
          )}
        </dl>
        {receipt.note.trim() && <p className="receipt-paper__note">Catatan: {receipt.note.trim()}</p>}
        <footer className="receipt-paper__sign">
          <div>Tanda terima</div>
          <div>Hormat kami</div>
        </footer>
      </article>
    </div>,
    document.body,
  );
}
