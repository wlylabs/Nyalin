import { formatBytes, validateImageFile, MAX_FILE_SIZE } from './file';
import { textFileName } from './download';

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

describe('textFileName', () => {
  it('membuat nama file .txt yang aman', () => {
    expect(textFileName('Catatan Rapat (1).JPG')).toBe('nyalin-catatan-rapat-1.txt');
    expect(textFileName('.png')).toBe('nyalin-gambar.txt');
  });
});
