import { receiptFileName } from './receiptImage';

describe('receiptFileName', () => {
  it('nama file aman dari nomor & nama toko', () => {
    expect(receiptFileName({ title: 'Toko Maju (Jaya)!', number: '0007', date: 0, items: [] })).toBe(
      'nota-0007-toko-maju-jaya.png',
    );
    expect(receiptFileName({ title: '', date: 0, items: [] })).toBe('nota.png');
  });
});
