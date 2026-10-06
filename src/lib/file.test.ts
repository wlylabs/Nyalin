import { formatBytes, validateImageFile, MAX_FILE_SIZE } from './file';
import { receiptFileName } from './receiptImage';

describe('validateImageFile', () => {
  it('menerima JPG, PNG, WEBP', () => {
    expect(validateImageFile({ name: 'a.jpg', type: 'image/jpeg', size: 1000 })).toBeNull();
    expect(validateImageFile({ name: 'a.webp', type: 'image/webp', size: 1000 })).toBeNull();
  });

  it('memakai ekstensi saat MIME type kosong', () => {
    expect(validateImageFile({ name: 'scan.PNG', type: '', size: 1000 })).toBeNull();
  });

  it('menolak format lain, file kosong, dan file terlalu besar', () => {
    expect(validateImageFile({ name: 'a.heic', type: 'image/heic', size: 1000 })).toBe('unsupported');
    expect(validateImageFile({ name: 'a.pdf', type: 'application/pdf', size: 1000 })).toBe('unsupported');
    expect(validateImageFile({ name: 'a.png', type: 'image/png', size: 0 })).toBe('empty-file');
    expect(validateImageFile({ name: 'a.png', type: 'image/png', size: MAX_FILE_SIZE + 1 })).toBe('too-large');
  });
});

describe('formatBytes', () => {
  it('memakai format angka Indonesia', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(26 * 1024)).toBe('26 KB');
    expect(formatBytes(2.5 * 1024 * 1024)).toBe('2,5 MB');
  });
});

describe('receiptFileName', () => {
  it('nama file aman dari nomor & nama toko', () => {
    expect(receiptFileName({ title: 'Toko Maju (Jaya)!', number: '0007', date: 0, items: [] })).toBe(
      'nota-0007-toko-maju-jaya.png',
    );
    expect(receiptFileName({ title: '', date: 0, items: [] })).toBe('nota.png');
  });
});
