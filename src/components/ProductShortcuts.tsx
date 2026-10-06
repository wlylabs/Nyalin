import { useId, useRef, useState } from 'react';
import { Plus, Search, Settings2, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Modal } from './Modal';
import { NumberField, rupiahField } from './NumberField';
import { formatRupiah } from '../lib/receipt';
import { productStore, suggestProducts, useSavedProducts, type SavedProduct } from '../state/productStore';
import './ProductPicker.css';

const SHORTCUT_LIMIT = 8;

/** Barang tersimpan sebagai tombol cepat: sekali klik, barang (beserta harganya) masuk nota. */
export function ProductShortcuts({ onAdd }: { onAdd: (product: SavedProduct) => void }) {
  const products = useSavedProducts();
  const [manageOpen, setManageOpen] = useState(false);
  const headingId = useId();
  const shown = products.slice(0, SHORTCUT_LIMIT);
  const hidden = products.length - shown.length;

  return (
    <section className="product-shortcuts" aria-labelledby={headingId}>
      <div className="product-shortcuts__head">
        <h2 id={headingId} className="product-shortcuts__title">
          Barang tersimpan
        </h2>
        <Button size="sm" variant="ghost" icon={<Settings2 />} onClick={() => setManageOpen(true)}>
          Kelola
        </Button>
      </div>
      {shown.length === 0 ? (
        <p className="product-shortcuts__empty">
          Nama barang yang diketik di nota otomatis tersimpan di sini. Lain kali tinggal klik untuk menambahkannya.
        </p>
      ) : (
        <ul className="product-shortcuts__list">
          {shown.map((product) => (
            <li key={product.name}>
              <button type="button" className="product-chip" onClick={() => onAdd(product)}>
                <Plus className="product-chip__icon" aria-hidden="true" />
                <span className="sr-only">Tambah </span>
                <span className="product-chip__name">{product.name}</span>
                {product.price > 0 && <span className="product-chip__price">{formatRupiah(product.price)}</span>}
              </button>
            </li>
          ))}
          {hidden > 0 && (
            <li>
              <button type="button" className="product-chip product-chip--more" onClick={() => setManageOpen(true)}>
                +{hidden} lainnya
              </button>
            </li>
          )}
        </ul>
      )}
      <ProductManager open={manageOpen} onClose={() => setManageOpen(false)} onAdd={onAdd} />
    </section>
  );
}

/** Daftar barang: tulis & simpan barang baru, ubah harga, cari, tambahkan ke nota, atau hapus. */
function ProductManager({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (product: SavedProduct) => void;
}) {
  const id = useId();
  // Pesan ditampilkan di dalam modal: toast di luar <dialog> tidak bisa diklik selama modal terbuka.
  const [status, setStatus] = useState<{ message: string; undo?: SavedProduct } | null>(null);
  const products = useSavedProducts();
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [query, setQuery] = useState('');
  const existing = productStore.find(name);
  const exact = productStore.find(query);
  const listed = query.trim() ? [...(exact ? [exact] : []), ...suggestProducts(products, query, Infinity)] : products;

  const save = () => {
    if (!name.trim()) {
      nameRef.current?.focus();
      return;
    }
    productStore.save(name, price);
    setStatus({ message: existing ? `${existing.name} diperbarui.` : `${name.trim()} disimpan.` });
    setName('');
    setPrice(0);
    nameRef.current?.focus();
  };

  const remove = (product: SavedProduct) => {
    productStore.remove(product.name);
    setStatus({ message: `${product.name} dihapus.`, undo: product });
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        setStatus(null);
        onClose();
      }}
      title="Daftar barang"
    >
      <form
        className="product-form"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="product-form__field product-form__field--name">
          <label htmlFor={`${id}-name`}>Nama barang</label>
          <input
            ref={nameRef}
            id={`${id}-name`}
            className="receipt-row__field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mis. Gula pasir 1 kg"
            autoComplete="off"
            autoCapitalize="sentences"
          />
        </div>
        <div className="product-form__field">
          <label htmlFor={`${id}-price`}>Harga</label>
          <NumberField
            id={`${id}-price`}
            className="receipt-row__field product-form__price"
            {...rupiahField}
            value={price}
            onCommit={setPrice}
          />
        </div>
        <Button type="submit" variant="primary" icon={<Plus />} className="product-form__submit">
          {existing ? 'Perbarui' : 'Simpan'}
        </Button>
      </form>
      {existing && (
        <p className="product-form__hint">
          {existing.name} sudah ada di daftar{price > 0 ? ' — harganya akan diperbarui.' : '.'}
        </p>
      )}

      <p className="product-status" role="status">
        {status?.message}
        {status?.undo && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              productStore.restore(status.undo!);
              setStatus({ message: `${status.undo!.name} dikembalikan.` });
            }}
          >
            Urungkan
          </Button>
        )}
      </p>

      {products.length > 0 && (
        <div className="product-search">
          <Search className="product-search__icon" aria-hidden="true" />
          <label htmlFor={`${id}-search`} className="sr-only">
            Cari barang tersimpan
          </label>
          <input
            id={`${id}-search`}
            type="search"
            className="receipt-row__field product-search__input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Cari di ${products.length} barang`}
            autoComplete="off"
          />
        </div>
      )}

      {products.length === 0 ? (
        <p className="product-list__empty">Belum ada barang tersimpan.</p>
      ) : listed.length === 0 ? (
        <p className="product-list__empty">Tidak ada barang yang cocok.</p>
      ) : (
        <ul className="product-list" aria-label="Barang tersimpan">
          {listed.map((product) => (
            <li key={product.name} className="product-list__row">
              <span className="product-list__name">{product.name}</span>
              <NumberField
                className="receipt-row__field product-list__price"
                aria-label={`Harga ${product.name}, rupiah`}
                {...rupiahField}
                value={product.price}
                onCommit={(next) => productStore.save(product.name, next)}
              />
              <IconButton
                size="sm"
                label={`Tambah ${product.name} ke nota`}
                icon={<Plus />}
                onClick={() => {
                  onAdd(product);
                  setStatus({ message: `${product.name} ditambahkan ke nota.` });
                }}
              />
              <IconButton
                size="sm"
                label={`Hapus ${product.name} dari daftar`}
                icon={<Trash2 />}
                onClick={() => remove(product)}
              />
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
