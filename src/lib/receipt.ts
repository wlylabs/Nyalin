/**
 * Nota digital: model data, hitungan (subtotal, diskon, kembalian), dan format teks WhatsApp.
 *
 * Pembaca teks bebas di bawah (struk, catatan belanja, "beras dua kilo tiga puluh ribu") berasal dari
 * versi lama yang membaca foto/voice note. Kini hanya dipakai untuk membuka riwayat lama yang
 * belum punya nota, supaya data user tidak hilang.
 */

export interface ReceiptItem {
  id: string;
  /** Jumlah barang (boleh pecahan, mis. 1,5). */
  qty: number;
  name: string;
  /** Harga satuan dalam rupiah. 0 = belum diisi. */
  price: number;
}

/**
 * Isi nota mengikuti nota kontan pada umumnya: identitas toko, nomor, tanggal, pembeli,
 * daftar barang, total, dan pembayaran. Field opsional ditambahkan belakangan —
 * nota lama di riwayat tetap terbaca (lihat `normalizeReceipt`).
 */
export interface Receipt {
  /** Nama toko / keterangan nota. */
  title: string;
  /** Alamat atau nomor telepon toko. */
  address?: string;
  /** Nomor nota. */
  number?: string;
  /** Nama pembeli ("Kepada"). */
  customer?: string;
  /** Tanggal nota (ms). */
  date: number;
  items: ReceiptItem[];
  /** Potongan harga untuk seluruh nota (rupiah). */
  discount?: number;
  /** Uang yang dibayarkan; 0 = belum diisi. */
  paid?: number;
  note?: string;
  /** Total yang tercetak di struk asal, untuk dicocokkan dengan hitungan nota. */
  printedTotal?: number | null;
}

export function normalizeReceipt(receipt: Receipt): Required<Receipt> {
  return {
    address: '',
    number: '',
    customer: '',
    discount: 0,
    paid: 0,
    note: '',
    printedTotal: null,
    ...receipt,
  };
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

/** Jumlah semua subtotal barang (sebelum diskon). */
export function receiptTotal(items: ReceiptItem[]): number {
  return items.reduce((sum, item) => sum + itemSubtotal(item), 0);
}

/** Total yang harus dibayar: subtotal barang dikurangi diskon. */
export function receiptGrandTotal(receipt: Receipt): number {
  return Math.max(0, receiptTotal(receipt.items) - (receipt.discount ?? 0));
}

/** Kembalian (positif) atau kekurangan (negatif); null bila uang bayar belum diisi. */
export function receiptChange(receipt: Receipt): number | null {
  return receipt.paid ? receipt.paid - receiptGrandTotal(receipt) : null;
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
  /\b(sub\s*total|total|grand\s*total|kembali(an)?|tunai|cash|bayar|pembayaran|ppn|pajak|tax|change|debit|kredit|saldo|anggaran|diskon|disc|discount|potongan|hemat|voucher)\b/i;
const DISCOUNT_LINE = /\b(diskon|disc|discount|potongan|hemat|voucher)\b/i;
/** "TOTAL", "Grand Total", "Total Belanja" — bukan subtotal atau anggaran. */
const TOTAL_LINE = /\b(grand\s*total|total)\b/i;
const NOT_TOTAL = /\b(sub\s*total|anggaran|item|qty|jumlah\s+barang|hemat|diskon)\b/i;
const ADDRESS_LINE = /\b(jl|jln|jalan|telp|tlp|telepon|hp|wa|kec|kel|kota|kab|rt|rw|blok|ruko|gg|gang|no)\b\.?/i;
/** Nomor telepon / kontak toko: "Telp 0812-3456-7890", "WA 08123456789". */
const CONTACT_LINE = /\b(telp|tlp|telepon|hp|wa|whatsapp|npwp)\b|\b0\d{2,4}[-\s]\d{3,4}[-\s]?\d{3,4}\b/i;
const DATE = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/;
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

/** "INDOMIE GORENG" (gaya struk) → "Indomie Goreng". Teks campuran dibiarkan. */
function softenCaps(text: string): string {
  if (text.length < 4 || text !== text.toUpperCase() || !/[A-Z]{3}/.test(text)) return text;
  return text.toLowerCase().replace(/(^|[\s(/-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

function cleanName(name: string): string {
  const cleaned = name
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—:=,.;@x×*]+|[\s\-–—:=,.;@×*]+$/gi, '')
    .replace(FILLER_PREFIX, '')
    .trim();
  const softened = softenCaps(cleaned);
  return softened.charAt(0).toUpperCase() + softened.slice(1);
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
  if (SUMMARY_LINE.test(line) || DATE_OR_TIME.test(line) || CONTACT_LINE.test(line)) return null;
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

/** Memecah satu baris jadi kandidat barang (titik koma, koma, akhir kalimat, "dan"). */
function splitCandidates(line: string): string[] {
  return line
    .split(/;|,\s+(?=\D)|\.\s+(?=[A-Z])|\s+dan\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Harga terakhir di sebuah baris ringkasan, mis. "TOTAL      106.000" → 106000. */
function lastPrice(line: string): number | null {
  const prices = tokenize(replaceNumberWords(line)).filter((t) => t.kind === 'price');
  return prices.length ? prices[prices.length - 1].value : null;
}

function parseDate(line: string): number | null {
  const m = DATE.exec(line);
  if (!m) return null;
  const [, d, mo, y] = m.map(Number);
  const year = y < 100 ? 2000 + y : y;
  const date = new Date(year, mo - 1, d, 12);
  const valid = date.getMonth() === mo - 1 && date.getDate() === d && year >= 2000 && year <= 2100;
  return valid ? date.getTime() : null;
}

export interface ReceiptAnalysis {
  items: ReceiptItem[];
  /** Nama toko dari baris paling atas struk. */
  store: string;
  address: string;
  date: number | null;
  discount: number;
  printedTotal: number | null;
}

/**
 * Membaca teks bebas jadi nota.
 * - Barang: lihat `parseReceiptLine`. Bila ada baris berharga, baris tanpa harga (salam, slogan) diabaikan;
 *   bila tidak ada harga sama sekali (daftar belanja), semua barang diambil dengan harga kosong.
 * - Struk: nama toko & alamat dari baris sebelum barang pertama, tanggal, diskon, dan total tercetak
 *   (dipakai untuk memeriksa apakah ada barang yang terlewat).
 */
export function analyzeReceiptText(text: string): ReceiptAnalysis {
  const rawLines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const parsed: (ParsedLine & { line: number })[] = [];
  let discount = 0;
  let total: number | null = null;
  let grandTotal: number | null = null;
  let date: number | null = null;

  rawLines.forEach((raw, index) => {
    date ??= parseDate(raw);
    if (DISCOUNT_LINE.test(raw)) {
      discount += Math.abs(lastPrice(raw) ?? 0);
      return;
    }
    if (TOTAL_LINE.test(raw) && !NOT_TOTAL.test(raw)) {
      const value = lastPrice(raw);
      if (value !== null) {
        if (/grand\s*total/i.test(raw)) grandTotal ??= value;
        else total ??= value;
      }
      return;
    }
    for (const candidate of splitCandidates(raw)) {
      const item = parseReceiptLine(candidate);
      if (item) parsed.push({ ...item, line: index });
    }
  });

  const anyPrice = parsed.some((l) => l.hasPrice);
  const kept = parsed.filter((l) => !anyPrice || l.hasPrice);

  // Kepala struk: baris sebelum barang berharga pertama.
  let store = '';
  const addressParts: string[] = [];
  if (anyPrice) {
    const firstItemLine = kept[0].line;
    for (const raw of rawLines.slice(0, firstItemLine)) {
      if (DATE.test(raw) || SUMMARY_LINE.test(raw) || /^(nota|struk|kwitansi|kuitansi)\b/i.test(raw)) continue;
      const digits = (raw.match(/\d/g) ?? []).length;
      if (!store && !ADDRESS_LINE.test(raw) && /[a-z]{3}/i.test(raw) && digits <= 2) store = softenCaps(raw);
      else if (store && (ADDRESS_LINE.test(raw) || /\d{6,}/.test(raw.replace(/[\s-]/g, ''))))
        addressParts.push(softenCaps(raw));
    }
  }

  return {
    items: kept.map((l) => ({ id: createItemId(), qty: l.qty, name: l.name, price: l.price })),
    store,
    address: addressParts.slice(0, 2).join(' · '),
    date,
    discount,
    printedTotal: anyPrice ? (grandTotal ?? total) : null,
  };
}

export function parseReceipt(text: string): ReceiptItem[] {
  return analyzeReceiptText(text).items;
}

export interface ReceiptDefaults {
  title?: string;
  address?: string;
  number?: string;
}

/** Nota baru dari teks hasil baca. Nama toko dari struk diutamakan; bila tidak ada, pakai profil toko. */
export function createReceipt(text: string, date = Date.now(), defaults: ReceiptDefaults = {}): Receipt {
  const found = analyzeReceiptText(text);
  return {
    title: found.store || defaults.title || '',
    address: found.store ? found.address : (defaults.address ?? ''),
    number: defaults.number ?? '',
    customer: '',
    date: found.date ?? date,
    items: found.items,
    discount: found.discount,
    paid: 0,
    note: '',
    printedTotal: found.printedTotal,
  };
}

export const formatReceiptDate = (date: number) =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date));

/**
 * Teks nota siap dibagikan ke WhatsApp: tanpa perataan kolom (rapi di font apa pun),
 * judul dan total ditebalkan dengan *…* sesuai format WhatsApp.
 */
export function formatReceiptText(input: Receipt): string {
  const receipt = normalizeReceipt(input);
  const items = receipt.items.filter((i) => i.name.trim() || i.price > 0);
  const lines: string[] = [`*${receipt.title.trim() || 'NOTA'}*`];
  if (receipt.address.trim()) lines.push(receipt.address.trim());
  lines.push(
    [receipt.number.trim() && `Nota No. ${receipt.number.trim()}`, formatReceiptDate(receipt.date)]
      .filter(Boolean)
      .join(' · '),
  );
  if (receipt.customer.trim()) lines.push(`Kepada: ${receipt.customer.trim()}`);
  lines.push('');
  items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.name.trim() || 'Barang'}`);
    lines.push(`   ${formatQty(item.qty)} × ${formatRupiah(item.price)} = ${formatRupiah(itemSubtotal(item))}`);
  });
  if (items.length) lines.push('');
  if (receipt.discount > 0) {
    lines.push(`Subtotal: ${formatRupiah(receiptTotal(items))}`);
    lines.push(`Diskon: -${formatRupiah(receipt.discount)}`);
  }
  lines.push(`*TOTAL (${items.length} barang): ${formatRupiah(receiptGrandTotal({ ...receipt, items }))}*`);
  const change = receiptChange({ ...receipt, items });
  if (change !== null) {
    lines.push(`Bayar: ${formatRupiah(receipt.paid)}`);
    lines.push(change >= 0 ? `Kembali: ${formatRupiah(change)}` : `Kurang: ${formatRupiah(-change)}`);
  }
  if (receipt.note.trim()) lines.push('', `Catatan: ${receipt.note.trim()}`);
  return lines.join('\n');
}
