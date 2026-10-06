import { productStore, suggestProducts } from './productStore';

describe('productStore', () => {
  beforeEach(() => {
    localStorage.clear();
    productStore._reset();
  });

  it('mengingat barang tanpa duplikat dan memperbarui harganya', () => {
    productStore.remember('Gula pasir', 15000);
    productStore.remember('  gula   PASIR ', 0);
    expect(productStore.list()).toHaveLength(1);
    // Harga kosong tidak menimpa harga tersimpan; nama mengikuti ketikan terakhir.
    expect(productStore.find('GULA PASIR')).toMatchObject({ name: 'gula PASIR', price: 15000, uses: 2 });

    productStore.remember('Gula pasir', 16000);
    expect(productStore.find('gula pasir')).toMatchObject({ price: 16000, uses: 3 });
  });

  it('mengurutkan dari yang paling sering dipakai', () => {
    productStore.remember('Teh', 5000);
    productStore.remember('Kopi', 3000);
    productStore.remember('Kopi', 3000);
    // Disimpan dari daftar barang tidak menambah hitungan pemakaian.
    productStore.save('Beras', 70000);
    expect(productStore.list().map((p) => p.name)).toEqual(['Kopi', 'Teh', 'Beras']);
  });

  it('menghapus dan mengembalikan barang', () => {
    productStore.save('Sabun', 4000);
    const sabun = productStore.find('sabun')!;
    productStore.remove('SABUN');
    expect(productStore.list()).toEqual([]);
    productStore.restore(sabun);
    expect(productStore.list()).toEqual([sabun]);
  });

  it('tersimpan di localStorage dan tahan data rusak', () => {
    productStore.save('Minyak goreng', 18000);
    productStore._reset();
    expect(productStore.find('minyak goreng')?.price).toBe(18000);

    localStorage.setItem('nyalin:barang:v1', '{rusak');
    productStore._reset();
    expect(productStore.list()).toEqual([]);

    localStorage.setItem('nyalin:barang:v1', JSON.stringify([{ name: '' }, null, { name: 'Telur', price: 2000 }]));
    productStore._reset();
    expect(productStore.list().map((p) => p.name)).toEqual(['Telur']);
  });
});

describe('suggestProducts', () => {
  const p = (name: string) => ({ name, price: 0, uses: 0, lastUsed: 0 });
  const products = [p('Minyak goreng'), p('Gula merah'), p('Gula pasir'), p('Teh gula batu')];

  it('mendahulukan awalan nama, lalu awalan kata, lalu potongan di tengah', () => {
    expect(suggestProducts(products, 'gu').map((x) => x.name)).toEqual(['Gula merah', 'Gula pasir', 'Teh gula batu']);
    expect(suggestProducts(products, 'reng').map((x) => x.name)).toEqual(['Minyak goreng']);
  });

  it('tidak menyarankan nama yang persis sama dengan ketikan', () => {
    expect(suggestProducts(products, 'gula pasir')).toEqual([]);
  });
});
