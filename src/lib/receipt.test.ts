import {
  analyzeReceiptText,
  createReceipt,
  formatReceiptText,
  isReceiptEmpty,
  receiptChange,
  receiptGrandTotal,
  parseQtyInput,
  parseReceipt,
  parseReceiptLine,
  parseRupiahInput,
  receiptTotal,
  replaceNumberWords,
} from './receipt';

const simplify = (text: string) => parseReceipt(text).map(({ qty, name, price }) => ({ qty, name, price }));

describe('parseReceiptLine', () => {
  it.each([
    ['Beras 5 kg 65.000', { qty: 1, name: 'Beras 5 kg', price: 65000 }],
    ['2x Indomie goreng 7.000', { qty: 2, name: 'Indomie goreng', price: 3500 }],
    ['Indomie 2 x 3.500 7.000', { qty: 2, name: 'Indomie', price: 3500 }],
    ['Aqua 600 ml @ Rp4.000 x3', { qty: 3, name: 'Aqua 600 ml', price: 4000 }],
    ['- Gula pasir 1 kg: 15rb', { qty: 1, name: 'Gula pasir 1 kg', price: 15000 }],
    ['Telur 10 butir 25k', { qty: 10, name: 'Telur', price: 2500 }],
    ['3 Sabun cuci Rp 4.500', { qty: 3, name: 'Sabun cuci', price: 1500 }],
    ['Kopi bubuk', { qty: 1, name: 'Kopi bubuk', price: 0 }],
    ['Pocari 2 botol', { qty: 2, name: 'Pocari', price: 0 }],
  ])('%s', (line, expected) => {
    expect(parseReceiptLine(line)).toMatchObject(expected);
  });

  it.each(['Total: Rp250.000', 'Kembalian 5.000', 'Tgl 06/10/2026 14:30', '08123456789', '-----'])(
    'mengabaikan "%s"',
    (line) => {
      expect(parseReceiptLine(line)).toBeNull();
    },
  );
});

describe('parseReceipt', () => {
  it('struk: baris tanpa harga (nama toko, alamat) diabaikan', () => {
    const text = `TOKO MAJU JAYA
Jl. Merdeka No. 10
Beras 5 kg      65.000
Minyak goreng 2 liter   34.000
2 x Indomie     7.000
TOTAL          106.000
TUNAI          110.000
KEMBALI          4.000`;
    expect(simplify(text)).toEqual([
      { qty: 1, name: 'Beras 5 kg', price: 65000 },
      { qty: 1, name: 'Minyak goreng 2 liter', price: 34000 },
      { qty: 2, name: 'Indomie', price: 3500 },
    ]);
  });

  it('catatan belanja tanpa harga: semua barang diambil, judul dan total dilewati', () => {
    const text = `Catatan Belanja
Beras 5 kg, minyak goreng 2 liter, telur 1 kg.
Jangan lupa beli gula pasir dan kopi bubuk.
Total anggaran: Rp250.000`;
    expect(simplify(text).map((i) => i.name)).toEqual([
      'Beras 5 kg',
      'Minyak goreng 2 liter',
      'Telur 1 kg',
      'Gula pasir',
      'Kopi bubuk',
    ]);
  });

  it('voice note dengan angka dalam kata', () => {
    const text =
      'Tadi beli beras dua kilo tiga puluh ribu, gula satu kilo lima belas ribu, dan telur sepuluh butir dua puluh lima ribu.';
    expect(simplify(text)).toEqual([
      { qty: 1, name: 'Beras 2 kilo', price: 30000 },
      { qty: 1, name: 'Gula 1 kilo', price: 15000 },
      { qty: 10, name: 'Telur', price: 2500 },
    ]);
  });
});

describe('utilitas', () => {
  it('angka dalam kata', () => {
    expect(replaceNumberWords('seratus dua puluh lima ribu')).toBe('125000');
    expect(replaceNumberWords('satu juta dua ratus ribu')).toBe('1200000');
    expect(replaceNumberWords('sebelas')).toBe('11');
    expect(replaceNumberWords('seribu lima ratus')).toBe('1500');
  });

  it('input angka', () => {
    expect(parseRupiahInput('Rp 15.000')).toBe(15000);
    expect(parseRupiahInput('')).toBe(0);
    expect(parseQtyInput('1,5')).toBe(1.5);
    expect(parseQtyInput('abc')).toBeNull();
  });

  it('total, diskon, kembalian & teks nota', () => {
    const receipt = {
      title: 'Warung Bu Sri',
      address: 'Jl. Melati 3',
      number: '0007',
      customer: 'Pak Budi',
      date: new Date(2026, 9, 6).getTime(),
      items: [
        { id: 'a', qty: 2, name: 'Indomie', price: 3500 },
        { id: 'b', qty: 1.5, name: 'Beras', price: 13000 },
      ],
      discount: 1500,
      paid: 30000,
      note: 'Lunas',
    };
    expect(receiptTotal(receipt.items)).toBe(26500);
    expect(receiptGrandTotal(receipt)).toBe(25000);
    expect(receiptChange(receipt)).toBe(5000);
    expect(receiptChange({ ...receipt, paid: 0 })).toBeNull();
    expect(formatReceiptText(receipt)).toBe(
      [
        '*Warung Bu Sri*',
        'Jl. Melati 3',
        'Nota No. 0007 · 6 Oktober 2026',
        'Kepada: Pak Budi',
        '',
        '1. Indomie',
        '   2 × Rp3.500 = Rp7.000',
        '2. Beras',
        '   1,5 × Rp13.000 = Rp19.500',
        '',
        'Subtotal: Rp26.500',
        'Diskon: -Rp1.500',
        '*TOTAL (2 barang): Rp25.000*',
        'Bayar: Rp30.000',
        'Kembali: Rp5.000',
        '',
        'Catatan: Lunas',
      ].join('\n'),
    );
  });

  it('nota kosong: hanya baris tanpa nama & harga, atau tanpa barang', () => {
    const base = { title: 'Toko', date: 0 };
    expect(isReceiptEmpty({ ...base, items: [] })).toBe(true);
    expect(isReceiptEmpty({ ...base, items: [{ id: 'a', qty: 3, name: '  ', price: 0 }] })).toBe(true);
    expect(isReceiptEmpty({ ...base, items: [{ id: 'a', qty: 1, name: 'Teh', price: 0 }] })).toBe(false);
    expect(isReceiptEmpty({ ...base, items: [{ id: 'a', qty: 1, name: '', price: 3000 }] })).toBe(false);
  });

  it('nota lama tanpa field baru tetap bisa diformat', () => {
    const text = formatReceiptText({ title: '', date: new Date(2026, 0, 2).getTime(), items: [] });
    expect(text).toBe(['*NOTA*', '2 Januari 2026', '', '*TOTAL (0 barang): Rp0*'].join('\n'));
  });
});

describe('analyzeReceiptText (struk)', () => {
  const struk = `TOKO MAJU JAYA
Jl. Merdeka No. 10, Bandung
Telp 0812-3456-7890
06/10/2026 14:30
INDOMIE GORENG   2 x 3.500   7.000
BERAS PANDAN 5KG             65.000
Diskon member               -2.000
SUBTOTAL                    72.000
TOTAL                       70.000
TUNAI                      100.000
KEMBALI                     30.000
Terima kasih`;

  it('mengambil toko, alamat, tanggal, barang, diskon, dan total tercetak', () => {
    const found = analyzeReceiptText(struk);
    expect(found.store).toBe('Toko Maju Jaya');
    expect(found.address).toBe('Jl. Merdeka No. 10, Bandung · Telp 0812-3456-7890');
    expect(new Date(found.date!).toDateString()).toBe(new Date(2026, 9, 6).toDateString());
    expect(found.items.map(({ qty, name, price }) => ({ qty, name, price }))).toEqual([
      { qty: 2, name: 'Indomie Goreng', price: 3500 },
      { qty: 1, name: 'Beras Pandan 5kg', price: 65000 },
    ]);
    expect(found.discount).toBe(2000);
    expect(found.printedTotal).toBe(70000);
  });

  it('nota baru: total hitungan cocok dengan struk; profil toko hanya dipakai bila struk tanpa nama', () => {
    const receipt = createReceipt(struk, 0, { title: 'Toko Saya', number: '0001' });
    expect(receipt.title).toBe('Toko Maju Jaya');
    expect(receipt.number).toBe('0001');
    expect(receiptGrandTotal(receipt)).toBe(receipt.printedTotal);
    expect(createReceipt('beras 10rb', 0, { title: 'Toko Saya', address: 'Jl. A' })).toMatchObject({
      title: 'Toko Saya',
      address: 'Jl. A',
    });
  });
});
