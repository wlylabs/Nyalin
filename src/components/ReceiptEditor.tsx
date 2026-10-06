import { useEffect, useId, useRef, useState, type InputHTMLAttributes } from 'react';
import { Plus, ReceiptText, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Modal } from './Modal';
import {
  emptyItem,
  formatQty,
  formatRupiah,
  itemSubtotal,
  parseQtyInput,
  parseRupiahInput,
  receiptTotal,
  type Receipt,
  type ReceiptItem,
} from '../lib/receipt';
import './ReceiptEditor.css';

const dateFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Input angka yang menyimpan teks ketikan selama fokus (agar "1," atau "15.0" tidak langsung
 * dirapikan), lalu menampilkan format rapi saat ditinggalkan.
 */
function NumberField({
  value,
  format,
  parse,
  onCommit,
  ...props
}: {
  value: number;
  format: (n: number) => string;
  parse: (s: string) => number | null;
  onCommit: (n: number) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      {...props}
      type="text"
      value={draft ?? format(value)}
      onFocus={(e) => {
        setDraft(format(value));
        props.onFocus?.(e);
        e.currentTarget.select();
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        const parsed = parse(e.target.value);
        if (parsed !== null) onCommit(parsed);
      }}
      onBlur={(e) => {
        setDraft(null);
        props.onBlur?.(e);
      }}
    />
  );
}

/** Editor nota digital: jumlah, nama barang, harga satuan, subtotal, dan total. */
export function ReceiptEditor({
  receipt,
  onChange,
  onRebuild,
}: {
  receipt: Receipt;
  onChange: (receipt: Receipt) => void;
  /** Baca ulang barang dari teks hasil (menimpa isi nota). */
  onRebuild: () => void;
}) {
  const titleId = useId();
  const nameRefs = useRef(new Map<string, HTMLInputElement>());
  const [focusId, setFocusId] = useState<string | null>(null);
  const [confirmRebuild, setConfirmRebuild] = useState(false);
  const { items } = receipt;
  const total = receiptTotal(items);

  useEffect(() => {
    if (!focusId) return;
    nameRefs.current.get(focusId)?.focus();
    setFocusId(null);
  }, [focusId]);

  const updateItem = (id: string, patch: Partial<ReceiptItem>) =>
    onChange({ ...receipt, items: items.map((item) => (item.id === id ? { ...item, ...patch } : item)) });

  const addItem = () => {
    const item = emptyItem();
    onChange({ ...receipt, items: [...items, item] });
    setFocusId(item.id);
  };

  const removeItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    onChange({ ...receipt, items: next });
    // Fokus pindah ke baris terdekat, atau tombol tambah bila nota kosong.
    const neighbour = next[Math.min(index, next.length - 1)];
    if (neighbour) setFocusId(neighbour.id);
  };

  return (
    <div className="receipt">
      <div className="receipt__head">
        <ReceiptText className="receipt__icon" aria-hidden="true" />
        <div className="receipt__head-text">
          <label htmlFor={titleId} className="sr-only">
            Nama toko atau keterangan nota
          </label>
          <input
            id={titleId}
            className="receipt__title"
            value={receipt.title}
            onChange={(e) => onChange({ ...receipt, title: e.target.value })}
            placeholder="Nama toko / keterangan"
            autoComplete="off"
          />
          <p className="receipt__date">{dateFormat.format(new Date(receipt.date))}</p>
        </div>
      </div>

      <div className="receipt__columns" aria-hidden="true">
        <span>Jml</span>
        <span>Nama barang</span>
        <span className="receipt__num">Harga satuan</span>
        <span className="receipt__num">Subtotal</span>
        <span />
      </div>

      {items.length === 0 ? (
        <p className="receipt__empty">
          Belum ada barang yang terbaca dari teks. Tambahkan barang satu per satu di bawah.
        </p>
      ) : (
        <ol className="receipt__items" aria-label="Daftar barang">
          {items.map((item, index) => {
            const n = index + 1;
            return (
              <li key={item.id} className="receipt-row">
                <NumberField
                  className="receipt-row__field receipt-row__qty"
                  aria-label={`Jumlah barang ${n}`}
                  inputMode="decimal"
                  value={item.qty}
                  format={formatQty}
                  parse={parseQtyInput}
                  onCommit={(qty) => updateItem(item.id, { qty })}
                />
                <input
                  ref={(el) => {
                    if (el) nameRefs.current.set(item.id, el);
                    else nameRefs.current.delete(item.id);
                  }}
                  className="receipt-row__field receipt-row__name"
                  aria-label={`Nama barang ${n}`}
                  value={item.name}
                  onChange={(e) => updateItem(item.id, { name: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && index === items.length - 1) {
                      e.preventDefault();
                      addItem();
                    }
                  }}
                  placeholder="Nama barang"
                  autoComplete="off"
                  autoCapitalize="sentences"
                />
                <NumberField
                  className="receipt-row__field receipt-row__price"
                  aria-label={`Harga satuan barang ${n}, rupiah`}
                  inputMode="numeric"
                  value={item.price}
                  format={(v) => (v ? formatRupiah(v) : '')}
                  parse={(s) => parseRupiahInput(s)}
                  onCommit={(price) => updateItem(item.id, { price })}
                  placeholder="Rp0"
                />
                <output className="receipt-row__subtotal" aria-label={`Subtotal barang ${n}`}>
                  {formatRupiah(itemSubtotal(item))}
                </output>
                <IconButton
                  className="receipt-row__remove"
                  size="sm"
                  label={`Hapus ${item.name.trim() || `barang ${n}`}`}
                  icon={<Trash2 />}
                  onClick={() => removeItem(index)}
                />
              </li>
            );
          })}
        </ol>
      )}

      <div className="receipt__actions">
        <Button size="sm" variant="ghost" icon={<Plus />} onClick={addItem}>
          Tambah barang
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon={<RefreshCw />}
          onClick={() => (items.length ? setConfirmRebuild(true) : onRebuild())}
        >
          Baca ulang dari teks
        </Button>
      </div>

      <div className="receipt__total" aria-live="polite">
        <span>
          Total <span className="receipt__count">({formatQty(items.length)} barang)</span>
        </span>
        <strong>{formatRupiah(total)}</strong>
      </div>

      <Modal
        open={confirmRebuild}
        onClose={() => setConfirmRebuild(false)}
        title="Baca ulang dari teks?"
        footer={
          <>
            <Button onClick={() => setConfirmRebuild(false)}>Batal</Button>
            <Button
              variant="primary"
              icon={<RefreshCw />}
              onClick={() => {
                setConfirmRebuild(false);
                onRebuild();
              }}
            >
              Baca ulang
            </Button>
          </>
        }
      >
        <p>Isi nota sekarang akan diganti dengan barang yang terbaca dari teks hasil. Perubahan di nota akan hilang.</p>
      </Modal>
    </div>
  );
}
