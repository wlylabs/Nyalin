import { useEffect, useId, useRef, useState } from 'react';
import { Plus, ReceiptText, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { InlineAlert } from './InlineAlert';
import { ItemNameField } from './ItemNameField';
import { NumberField, rupiahField } from './NumberField';
import { ProductShortcuts } from './ProductShortcuts';
import {
  emptyItem,
  formatQty,
  formatReceiptDate,
  formatRupiah,
  itemSubtotal,
  normalizeReceipt,
  parseQtyInput,
  receiptChange,
  receiptGrandTotal,
  receiptTotal,
  type Receipt,
  type ReceiptItem,
} from '../lib/receipt';
import { saveStoreProfile } from '../lib/storeProfile';
import { productStore, type SavedProduct } from '../state/productStore';
import './ReceiptEditor.css';

/** Editor nota digital: jumlah, nama barang, harga satuan, subtotal, dan total. */
export function ReceiptEditor({ receipt, onChange }: { receipt: Receipt; onChange: (receipt: Receipt) => void }) {
  const id = useId();
  const fieldId = (name: string) => `${id}-${name}`;
  const nameRefs = useRef(new Map<string, HTMLInputElement>());
  const [focusId, setFocusId] = useState<string | null>(null);
  /** Isi terakhir tiap baris yang sudah diingat, agar pemakaian barang tidak terhitung dua kali. */
  const remembered = useRef(new Map<string, string>());
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

  /** Baris ditinggalkan: nama & harganya diingat sebagai barang tersimpan. */
  const rememberItem = (item: ReceiptItem) => {
    const signature = `${item.name.trim().toLocaleLowerCase('id-ID')}|${item.price}`;
    if (!item.name.trim() || remembered.current.get(item.id) === signature) return;
    remembered.current.set(item.id, signature);
    productStore.remember(item.name, item.price);
  };

  /** Saran dipilih: nama & harga tersimpan mengisi baris (harga yang sudah diketik tidak ditimpa). */
  const pickProduct = (item: ReceiptItem, product: SavedProduct) =>
    updateItem(item.id, { name: product.name, price: item.price > 0 ? item.price : product.price });

  /**
   * Barang tersimpan diklik: bila sudah ada di nota jumlahnya ditambah satu, bila belum
   * mengisi baris kosong terakhir atau menambah baris baru.
   */
  const addProduct = (product: SavedProduct) => {
    const key = product.name.trim().toLocaleLowerCase('id-ID');
    const same = items.find((i) => i.name.trim().toLocaleLowerCase('id-ID') === key);
    const last = items[items.length - 1];
    let next: ReceiptItem[];
    let added: ReceiptItem;
    if (same) {
      added = { ...same, qty: same.qty + 1 };
      next = items.map((i) => (i.id === same.id ? added : i));
    } else if (last && !last.name.trim() && last.price === 0) {
      added = { ...last, name: product.name, price: product.price };
      next = items.map((i) => (i.id === last.id ? added : i));
    } else {
      added = { ...emptyItem(), name: product.name, price: product.price };
      next = [...items, added];
    }
    update({ items: next });
    remembered.current.set(added.id, `${key}|${added.price}`);
    productStore.remember(product.name, added.price);
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
          {/* Nomor & tanggal terisi otomatis (tanggal hari ini, atau tanggal yang terbaca di struk). */}
          <p className="receipt__auto">
            {full.number && <>No. {full.number} · </>}
            {formatReceiptDate(full.date)}
          </p>
        </div>
      </div>

      <div className="receipt-field">
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

      <div className="receipt__columns" aria-hidden="true">
        <span className="receipt__col-qty">Jml</span>
        <span className="receipt__col-name">Nama barang</span>
        <span className="receipt__col-price receipt__num">Harga</span>
        <span className="receipt__col-sub receipt__num">Subtotal</span>
      </div>

      {items.length === 0 ? (
        <p className="receipt__empty">Belum ada barang. Tambahkan barang satu per satu di bawah.</p>
      ) : (
        <ol className="receipt__items" aria-label="Daftar barang">
          {items.map((item, index) => {
            const n = index + 1;
            return (
              <li
                key={item.id}
                className="receipt-row"
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) rememberItem(item);
                }}
              >
                <NumberField
                  className="receipt-row__field receipt-row__qty"
                  aria-label={`Jumlah barang ${n}`}
                  inputMode="decimal"
                  value={item.qty}
                  format={formatQty}
                  parse={parseQtyInput}
                  onCommit={(qty) => updateItem(item.id, { qty })}
                />
                <ItemNameField
                  inputRef={(el) => {
                    if (el) nameRefs.current.set(item.id, el);
                    else nameRefs.current.delete(item.id);
                  }}
                  className="receipt-row__name"
                  aria-label={`Nama barang ${n}`}
                  value={item.name}
                  onChange={(name) => updateItem(item.id, { name })}
                  onPick={(product) => pickProduct(item, product)}
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
      </div>

      <ProductShortcuts onAdd={addProduct} />

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
    </div>
  );
}
