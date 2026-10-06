import { useEffect, useId, useRef, useState, type InputHTMLAttributes } from 'react';
import { Plus, ReceiptText, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { InlineAlert } from './InlineAlert';
import { Modal } from './Modal';
import {
  emptyItem,
  formatQty,
  formatRupiah,
  itemSubtotal,
  normalizeReceipt,
  parseQtyInput,
  parseRupiahInput,
  receiptChange,
  receiptGrandTotal,
  receiptTotal,
  type Receipt,
  type ReceiptItem,
} from '../lib/receipt';
import { saveStoreProfile } from '../lib/storeProfile';
import './ReceiptEditor.css';

/** Tanggal (ms) ↔ nilai <input type="date"> dalam zona waktu lokal. */
function toDateInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fromDateInput(value: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12).getTime() : null;
}

const rupiahField = {
  inputMode: 'numeric' as const,
  format: (v: number) => (v ? formatRupiah(v) : ''),
  parse: (s: string) => parseRupiahInput(s),
  placeholder: 'Rp0',
};

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
  /** Baca ulang barang dari teks hasil (menimpa isi nota). Tidak ada untuk nota manual. */
  onRebuild?: () => void;
}) {
  const id = useId();
  const fieldId = (name: string) => `${id}-${name}`;
  const nameRefs = useRef(new Map<string, HTMLInputElement>());
  const [focusId, setFocusId] = useState<string | null>(null);
  const [confirmRebuild, setConfirmRebuild] = useState(false);
  const full = normalizeReceipt(receipt);
  const { items } = full;
  const subtotal = receiptTotal(items);
  const total = receiptGrandTotal(full);
  const change = receiptChange(full);
  const totalMismatch = full.printedTotal !== null && full.printedTotal !== total && items.length > 0;

  const update = (patch: Partial<Receipt>) => onChange({ ...receipt, ...patch });
  /** Nama & alamat toko diingat untuk nota berikutnya. */
  const updateStore = (patch: Pick<Receipt, 'title'> | Pick<Receipt, 'address'>) => {
    const next = { ...full, ...patch };
    saveStoreProfile({ name: next.title, address: next.address });
    update(patch);
  };

  useEffect(() => {
    if (!focusId) return;
    nameRefs.current.get(focusId)?.focus();
    setFocusId(null);
  }, [focusId]);

  const updateItem = (id: string, patch: Partial<ReceiptItem>) =>
    update({ items: items.map((item) => (item.id === id ? { ...item, ...patch } : item)) });

  const addItem = () => {
    const item = emptyItem();
    update({ items: [...items, item] });
    setFocusId(item.id);
  };

  const removeItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    update({ items: next });
    // Fokus pindah ke baris terdekat, atau tombol tambah bila nota kosong.
    const neighbour = next[Math.min(index, next.length - 1)];
    if (neighbour) setFocusId(neighbour.id);
  };

  return (
    <div className="receipt">
      <div className="receipt__head">
        <ReceiptText className="receipt__icon" aria-hidden="true" />
        <div className="receipt__head-text">
          <label htmlFor={fieldId('title')} className="sr-only">
            Nama toko
          </label>
          <input
            id={fieldId('title')}
            className="receipt__title"
            value={full.title}
            onChange={(e) => updateStore({ title: e.target.value })}
            placeholder="Nama toko"
            autoComplete="organization"
          />
          <label htmlFor={fieldId('address')} className="sr-only">
            Alamat atau nomor HP toko
          </label>
          <input
            id={fieldId('address')}
            className="receipt__address"
            value={full.address}
            onChange={(e) => updateStore({ address: e.target.value })}
            placeholder="Alamat / no. HP toko (opsional)"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="receipt__meta">
        <div className="receipt-field">
          <label htmlFor={fieldId('number')}>No. nota</label>
          <input
            id={fieldId('number')}
            className="receipt-row__field"
            value={full.number}
            onChange={(e) => update({ number: e.target.value })}
            autoComplete="off"
          />
        </div>
        <div className="receipt-field">
          <label htmlFor={fieldId('date')}>Tanggal</label>
          <input
            id={fieldId('date')}
            type="date"
            className="receipt-row__field"
            value={toDateInput(full.date)}
            onChange={(e) => {
              const date = fromDateInput(e.target.value);
              if (date !== null) update({ date });
            }}
          />
        </div>
        <div className="receipt-field receipt-field--wide">
          <label htmlFor={fieldId('customer')}>Kepada</label>
          <input
            id={fieldId('customer')}
            className="receipt-row__field"
            value={full.customer}
            onChange={(e) => update({ customer: e.target.value })}
            placeholder="Nama pembeli (opsional)"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="receipt__columns" aria-hidden="true">
        <span className="receipt__col-qty">Jml</span>
        <span className="receipt__col-name">Nama barang</span>
        <span className="receipt__col-price receipt__num">Harga satuan</span>
        <span className="receipt__col-sub receipt__num">Subtotal</span>
      </div>

      {items.length === 0 ? (
        <p className="receipt__empty">Belum ada barang. Tambahkan barang satu per satu di bawah.</p>
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
                  {...rupiahField}
                  value={item.price}
                  onCommit={(price) => updateItem(item.id, { price })}
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
        {onRebuild && (
          <Button
            size="sm"
            variant="ghost"
            icon={<RefreshCw />}
            onClick={() => (items.length ? setConfirmRebuild(true) : onRebuild())}
          >
            Baca ulang dari foto/suara
          </Button>
        )}
      </div>

      <dl className="receipt__summary">
        <div className="receipt-sum">
          <dt>
            Subtotal <span className="receipt__count">({formatQty(items.length)} barang)</span>
          </dt>
          <dd>{formatRupiah(subtotal)}</dd>
        </div>
        <div className="receipt-sum">
          <dt>
            <label htmlFor={fieldId('discount')}>Diskon</label>
          </dt>
          <dd>
            <NumberField
              id={fieldId('discount')}
              className="receipt-row__field receipt-sum__input"
              {...rupiahField}
              value={full.discount}
              onCommit={(discount) => update({ discount })}
            />
          </dd>
        </div>
        <div className="receipt-sum receipt-sum--total" aria-live="polite">
          <dt>Total</dt>
          <dd>
            <strong>{formatRupiah(total)}</strong>
          </dd>
        </div>
        <div className="receipt-sum">
          <dt>
            <label htmlFor={fieldId('paid')}>Bayar</label>
          </dt>
          <dd>
            <NumberField
              id={fieldId('paid')}
              className="receipt-row__field receipt-sum__input"
              {...rupiahField}
              value={full.paid}
              onCommit={(paid) => update({ paid })}
            />
          </dd>
        </div>
        {change !== null && (
          <div className={`receipt-sum${change < 0 ? ' receipt-sum--short' : ''}`} aria-live="polite">
            <dt>{change >= 0 ? 'Kembali' : 'Kurang'}</dt>
            <dd>{formatRupiah(Math.abs(change))}</dd>
          </div>
        )}
      </dl>

      {totalMismatch && (
        <InlineAlert tone="warning" title="Total belum cocok dengan struk">
          Total di struk {formatRupiah(full.printedTotal!)}, hitungan nota {formatRupiah(total)}. Cek lagi barang,
          harga, atau diskon yang mungkin terlewat.
        </InlineAlert>
      )}

      <div className="receipt-field">
        <label htmlFor={fieldId('note')}>Catatan</label>
        <textarea
          id={fieldId('note')}
          className="receipt-row__field receipt__note"
          value={full.note}
          onChange={(e) => update({ note: e.target.value })}
          placeholder="Mis. lunas, DP, barang diantar besok (opsional)"
          rows={2}
        />
      </div>

      <Modal
        open={confirmRebuild}
        onClose={() => setConfirmRebuild(false)}
        title="Baca ulang barang?"
        footer={
          <>
            <Button onClick={() => setConfirmRebuild(false)}>Batal</Button>
            <Button
              variant="primary"
              icon={<RefreshCw />}
              onClick={() => {
                setConfirmRebuild(false);
                onRebuild?.();
              }}
            >
              Baca ulang
            </Button>
          </>
        }
      >
        <p>
          Barang di nota akan diganti dengan hasil baca ulang dari foto atau suara asli. Perubahan barang akan hilang.
        </p>
      </Modal>
    </div>
  );
}
