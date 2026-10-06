/**
 * Nota digital: daftar barang (jumlah, nama, harga satuan) yang dibaca dari teks hasil Nyalin
 * — struk belanja, catatan belanja tulisan tangan, atau voice note "beras dua kilo tiga puluh ribu".
 * Pembacaan sengaja sederhana dan bisa ditebak; user selalu bisa memperbaikinya di editor nota.
 */

export interface ReceiptItem {
  id: string;
  /** Jumlah barang (boleh pecahan, mis. 1,5). */
  qty: number;
  name: string;
  /** Harga satuan dalam rupiah. 0 = belum diisi. */
  price: number;
}

export interface Receipt {
  /** Nama toko / keterangan nota. */
  title: string;
  /** Waktu nota dibuat (ms). */
  date: number;
  items: ReceiptItem[];
}

let idCounter = 0;
export function createItemId(): string {
  idCounter += 1;
  return `i${Date.now().toString(36)}${idCounter.toString(36)}`;
}

export function emptyItem(): ReceiptItem {
  return { id: createItemId(), qty: 1, name: '', price: 0 };
}

export const itemSubtotal = (item: ReceiptItem) => Math.round(item.qty * item.price);

export function receiptTotal(items: ReceiptItem[]): number {
  return items.reduce((sum, item) => sum + itemSubtotal(item), 0);
}

const numberFormat = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });
export const formatQty = (n: number) => numberFormat.format(n);
export const formatRupiah = (n: number) => `Rp${new Intl.NumberFormat('id-ID').format(Math.round(n))}`;

/** "15.000", "Rp 15.000", "15000" → 15000. Angka kosong/tidak valid → 0. */
export function parseRupiahInput(value: string): number {
  const digits = value.replace(/,\d{1,2}$/, '').replace(/\D/g, '');
  return digits ? Math.min(Number(digits), 999_999_999_999) : 0;
}

/** "1,5" atau "1.5" → 1.5. Tidak valid → null. */
export function parseQtyInput(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}

/* ------------------------------------------------------------------ */
/* Angka dalam kata (hasil voice note): "tiga puluh lima ribu" → 35000 */
/* ------------------------------------------------------------------ */

const DIGIT_WORDS: Record<string, number> = {
  nol: 0,
  satu: 1,
  dua: 2,
  tiga: 3,
  empat: 4,
  lima: 5,
  enam: 6,
  tujuh: 7,
  delapan: 8,
  sembilan: 9,
};
const DIRECT_WORDS: Record<string, number> = { sepuluh: 10, sebelas: 11, seratus: 100 };
const NUMBER_WORD = new RegExp(
  `^(?:${[...Object.keys(DIGIT_WORDS), ...Object.keys(DIRECT_WORDS), 'belas', 'puluh', 'ratus', 'ribu', 'seribu', 'juta', 'sejuta'].join('|')})$`,
  'i',
);

function wordsToNumber(words: string[]): number {
  let total = 0;
  let group = 0;
  let small = 0;
  for (const raw of words) {
    const w = raw.toLowerCase();
    if (w in DIGIT_WORDS) small = DIGIT_WORDS[w];
    else if (w in DIRECT_WORDS) group += DIRECT_WORDS[w];
    else if (w === 'belas') ((group += 10 + small), (small = 0));
    else if (w === 'puluh') ((group += small * 10), (small = 0));
    else if (w === 'ratus') ((group += small * 100), (small = 0));
    else if (w === 'seribu') total += 1000;
    else if (w === 'sejuta') total += 1_000_000;
    else if (w === 'ribu') ((total += (group + small || 1) * 1000), (group = small = 0));
    else if (w === 'juta') ((total += (group + small || 1) * 1_000_000), (group = small = 0));
  }
  return total + group + small;
}

/** Mengganti rangkaian kata bilangan dengan angka: "beras dua kilo" → "beras 2 kilo". */
export function replaceNumberWords(text: string): string {
  return text.replace(/[a-z]+(?:\s+[a-z]+)*/gi, (phrase) => {
    const words = phrase.split(/\s+/);
    const out: string[] = [];
    let run: string[] = [];
    const flush = () => {
      if (run.length) out.push(String(wordsToNumber(run)));
      run = [];
    };
    for (const word of words) {
      if (NUMBER_WORD.test(word)) run.push(word);
      else (flush(), out.push(word));
    }
    flush();
    return out.join(' ');
  });
}

/* ------------------------------------------------------------------ */
/* Pembacaan baris                                                     */
/* ------------------------------------------------------------------ */

const MONEY_SUFFIX = /^(rb|ribu|k|rp|jt|juta|rupiah)$/i;
const MEASURE_SUFFIX = /^(kg|kilo|kilogram|g|gr|gram|ons|l|lt|ltr|liter|ml|m|meter|cm)$/i;
const COUNT_SUFFIX =
  /^(x|pcs|pc|bh|buah|bks|bungkus|btl|botol|pak|pack|dus|kotak|lembar|lbr|biji|butir|ekor|ikat|sachet|saset|porsi|gelas|cup|kaleng|sisir|papan|rim|unit|set)$/i;

/** Baris ringkasan pembayaran — bukan barang. */
const SUMMARY_LINE =
  /\b(sub\s*total|total|grand\s*total|kembali(an)?|tunai|cash|bayar|pembayaran|ppn|pajak|tax|change|debit|kredit|saldo|anggaran)\b/i;
/** Judul catatan tanpa angka, mis. "Catatan Belanja", "Daftar belanja minggu ini". */
const TITLE_LINE = /^(catatan|daftar|list|belanja(an)?|nota|struk|kwitansi|kuitansi)\b/i;
const DATE_OR_TIME = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{1,2}[:.]\d{2}(?::\d{2})?\s*(wib|wita|wit)?\b/i;
/** Kata pengantar dalam catatan/ucapan yang bukan bagian nama barang. */
const FILLER_PREFIX =
  /^(dan\s+|jangan\s+lupa\s+|tolong\s+|aku\s+|saya\s+|tadi\s+|sudah\s+|udah\s+|habis\s+|terus\s+|lalu\s+|sama\s+|juga\s+|beli(in)?\s+)+/i;

interface NumberToken {
  start: number;
  end: number;
  value: number;
  kind: 'price' | 'measure' | 'count' | 'bare';
  /** Diawali "@", "x", atau "×" — tanda harga satuan / jumlah. */
  connector: 'at' | 'times' | null;
}

const TOKEN =
  /(?:(?<![a-z])(@|[x×*])\s*)?(rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d+)?)(?:\s*([a-z]+)\b)?\.?/gi;

function toNumber(raw: string, suffix: string): number {
  const isThousands = /^\d{1,3}([.,])\d{3}(\1\d{3})*(,\d{1,2})?$/.test(raw);
  let value = isThousands ? Number(raw.replace(/,\d{1,2}$/, '').replace(/[.,]/g, '')) : Number(raw.replace(',', '.'));
  const s = suffix.toLowerCase();
  if (s === 'rb' || s === 'ribu' || s === 'k') value *= 1000;
  else if (s === 'jt' || s === 'juta') value *= 1_000_000;
  return Math.round(value * 100) / 100;
}

function tokenize(line: string): NumberToken[] {
  const tokens: NumberToken[] = [];
  for (const m of line.matchAll(TOKEN)) {
    const [whole, conn = '', rp = '', raw, suffixRaw = ''] = m;
    const start = m.index!;
    // Angka yang menempel di huruf (mis. "B2", "A4") adalah bagian nama.
    if (start > 0 && /[a-z]/i.test(line[start - 1]) && !conn) continue;
    // Nomor telepon/kode panjang bukan harga.
    if (/^\d{8,}$/.test(raw)) continue;

    let suffix = suffixRaw;
    let end = start + whole.length;
    // Akhiran yang bukan satuan (mis. "2 telur") tidak ikut dikonsumsi.
    if (suffix && !MONEY_SUFFIX.test(suffix) && !MEASURE_SUFFIX.test(suffix) && !COUNT_SUFFIX.test(suffix)) {
      end = start + whole.lastIndexOf(raw) + raw.length;
      suffix = '';
    }
    const hasRp = Boolean(rp);
    const value = toNumber(raw, suffix);
    const isThousands = /[.,]\d{3}/.test(raw);
    let kind: NumberToken['kind'];
    if (hasRp || MONEY_SUFFIX.test(suffix)) kind = 'price';
    else if (MEASURE_SUFFIX.test(suffix)) kind = 'measure';
    else if (COUNT_SUFFIX.test(suffix)) kind = 'count';
    else if (isThousands || value >= 500) kind = 'price';
    else kind = 'bare';
    const connector = conn === '@' ? 'at' : conn ? 'times' : null;
    tokens.push({ start, end, value, kind, connector });
  }
  return tokens;
}

function cleanName(name: string): string {
  const cleaned = name
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—:=,.;@x×*]+|[\s\-–—:=,.;@×*]+$/gi, '')
    .replace(FILLER_PREFIX, '')
    .trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export interface ParsedLine {
  qty: number;
  name: string;
  /** Harga satuan; 0 bila tidak ada harga di baris ini. */
  price: number;
  hasPrice: boolean;
}

/** Membaca satu baris jadi barang nota. null bila baris bukan barang. */
export function parseReceiptLine(input: string): ParsedLine | null {
  let line = input.replace(/^\s*(?:[-•*·▪]|\d{1,2}[.)](?=\s))\s*/, '').trim();
  if (!line || !/[a-z]/i.test(line)) return null;
  if (SUMMARY_LINE.test(line) || DATE_OR_TIME.test(line)) return null;
  line = replaceNumberWords(line);

  const tokens = tokenize(line);
  const prices = tokens.filter((t) => t.kind === 'price');
  if (prices.length === 0 && TITLE_LINE.test(line)) return null;

  const consumed: NumberToken[] = [...prices];
  // Jumlah: angka bersatuan hitung ("2 pcs", "x2"), atau angka polos di awal/akhir baris.
  let qtyToken = tokens.find((t) => t.kind === 'count');
  if (!qtyToken) {
    const bare = tokens.filter((t) => t.kind === 'bare');
    qtyToken = bare.find((t) => {
      const before = line.slice(0, t.start);
      const after = line.slice(t.end);
      const afterWithoutPrices = prices.reduce(
        (rest, p) => (p.start >= t.end ? rest.replace(line.slice(p.start, p.end), '') : rest),
        after,
      );
      return !/[a-z]/i.test(before) || !/[a-z]/i.test(afterWithoutPrices) || /^\s*[x×@]/i.test(after);
    });
  }
  if (qtyToken) consumed.push(qtyToken);
  let qty = qtyToken && qtyToken.value > 0 ? qtyToken.value : 1;

  let price = 0;
  if (prices.length >= 2) {
    // "Indomie 2 x 3.500 7.000": harga pertama = satuan, terakhir = subtotal.
    const unit = prices[0].value;
    const last = prices[prices.length - 1].value;
    if (!qtyToken && unit > 0 && last % unit === 0 && last / unit > 1) qty = last / unit;
    price = unit;
  } else if (prices.length === 1) {
    const p = prices[0];
    // Tanpa tanda "@"/"x", harga dianggap yang dibayar untuk baris itu → dibagi jumlah.
    const isUnit = p.connector !== null || /[@x×]\s*$/i.test(line.slice(0, p.start));
    price = !isUnit && qty > 1 && p.value % qty === 0 ? p.value / qty : p.value;
  }

  // Nama = sisa baris setelah angka harga & jumlah dibuang (satuan ukur seperti "5 kg" tetap).
  let name = '';
  let cursor = 0;
  for (const t of [...consumed].sort((a, b) => a.start - b.start)) {
    name += `${line.slice(cursor, t.start)} `;
    cursor = Math.max(cursor, t.end);
  }
  name += line.slice(cursor);
  name = cleanName(name.replace(/\s[x×@]\s/gi, ' '));
  if (!name || !/[a-z]/i.test(name)) return null;

  return { qty, name, price, hasPrice: prices.length > 0 };
}

/** Memecah teks jadi kandidat baris barang (baris baru, titik koma, koma, "dan"). */
function splitCandidates(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n|;|,\s+(?=\D)|\.\s+(?=[A-Z])|\s+dan\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Membaca teks bebas jadi daftar barang.
 * Bila ada baris berharga, baris tanpa harga (judul toko, alamat, salam) diabaikan.
 * Bila tidak ada harga sama sekali (daftar belanja), semua baris barang diambil dengan harga kosong.
 */
export function parseReceipt(text: string): ReceiptItem[] {
  const lines = splitCandidates(text)
    .map(parseReceiptLine)
    .filter((l): l is ParsedLine => l !== null);
  const anyPrice = lines.some((l) => l.hasPrice);
  return lines
    .filter((l) => !anyPrice || l.hasPrice)
    .map((l) => ({ id: createItemId(), qty: l.qty, name: l.name, price: l.price }));
}

export function createReceipt(text: string, date = Date.now()): Receipt {
  return { title: '', date, items: parseReceipt(text) };
}

/** Teks nota siap dibagikan (WhatsApp, catatan) — tanpa perataan kolom agar rapi di font apa pun. */
export function formatReceiptText(receipt: Receipt): string {
  const dateText = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(receipt.date),
  );
  const items = receipt.items.filter((i) => i.name.trim() || i.price > 0);
  const lines = [receipt.title.trim() ? `NOTA — ${receipt.title.trim()}` : 'NOTA', dateText, ''];
  items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.name.trim() || 'Barang'}`);
    lines.push(`   ${formatQty(item.qty)} × ${formatRupiah(item.price)} = ${formatRupiah(itemSubtotal(item))}`);
  });
  if (items.length) lines.push('');
  lines.push(`TOTAL (${items.length} barang): ${formatRupiah(receiptTotal(items))}`);
  return lines.join('\n');
}
