import {
  claimReceiptNumber,
  getStoreProfile,
  peekReceiptNumber,
  receiptDefaults,
  saveStoreProfile,
} from './storeProfile';

describe('storeProfile', () => {
  beforeEach(() => localStorage.clear());

  it('nomor nota hanya bertambah setelah dipakai', () => {
    expect(peekReceiptNumber()).toBe('0001');
    expect(peekReceiptNumber()).toBe('0001');
    claimReceiptNumber('0001');
    expect(peekReceiptNumber()).toBe('0002');
    // Nomor yang diketik/diulang lebih kecil tidak memundurkan urutan.
    claimReceiptNumber('0001');
    claimReceiptNumber('abc');
    expect(peekReceiptNumber()).toBe('0002');
  });

  it('profil toko dipakai sebagai nilai awal nota', () => {
    saveStoreProfile({ name: 'Toko Berkah', address: 'Jl. Melati 3' });
    expect(getStoreProfile()).toEqual({ name: 'Toko Berkah', address: 'Jl. Melati 3' });
    expect(receiptDefaults()).toEqual({ title: 'Toko Berkah', address: 'Jl. Melati 3', number: '0001' });
  });
});
