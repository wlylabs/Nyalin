import { useId, useState, type InputHTMLAttributes, type Ref } from 'react';
import { formatRupiah } from '../lib/receipt';
import { suggestProducts, useSavedProducts, type SavedProduct } from '../state/productStore';
import './ProductPicker.css';

/**
 * Input nama barang dengan saran dari barang tersimpan (pola combobox ARIA).
 * Panah atas/bawah memilih saran, Enter memakai saran yang disorot, Esc menutup daftar.
 */
export function ItemNameField({
  value,
  onChange,
  onPick,
  inputRef,
  className,
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
  onPick: (product: SavedProduct) => void;
  inputRef?: Ref<HTMLInputElement>;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const listId = useId();
  const products = useSavedProducts();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const suggestions = value.trim() ? suggestProducts(products, value) : [];
  const expanded = open && suggestions.length > 0;
  const optionId = (i: number) => `${listId}-${i}`;

  const pick = (product: SavedProduct) => {
    onPick(product);
    setOpen(false);
    setActive(-1);
  };

  return (
    <div className={['item-name', className].filter(Boolean).join(' ')}>
      <input
        {...props}
        ref={inputRef}
        className="receipt-row__field item-name__input"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={(e) => {
          setOpen(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setOpen(false);
          setActive(-1);
          props.onBlur?.(e);
        }}
        onKeyDown={(e) => {
          if (expanded) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              const step = e.key === 'ArrowDown' ? 1 : -1;
              // Berputar: tanpa sorotan (-1) → saran pertama … saran terakhir → tanpa sorotan.
              const slots = suggestions.length + 1;
              setActive((i) => ((i + 1 + step + slots) % slots) - 1);
              return;
            }
            if (e.key === 'Enter' && active >= 0 && suggestions[active]) {
              e.preventDefault();
              pick(suggestions[active]);
              return;
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              setOpen(false);
              setActive(-1);
              return;
            }
          }
          props.onKeyDown?.(e);
        }}
      />
      <ul id={listId} role="listbox" aria-label="Saran barang tersimpan" className="item-name__list" hidden={!expanded}>
        {expanded &&
          suggestions.map((product, i) => (
            <li
              key={product.name}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              className="item-name__option"
              // Jangan sampai input kehilangan fokus sebelum klik terbaca.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(product)}
            >
              <span className="item-name__option-name">{product.name}</span>
              {product.price > 0 && <span className="item-name__option-price">{formatRupiah(product.price)}</span>}
            </li>
          ))}
      </ul>
    </div>
  );
}
