import { excerpt, formatNumber } from './text';

describe('excerpt', () => {
  it('memotong di batas kata', () => {
    expect(excerpt('satu dua tiga empat', 12)).toBe('satu dua…');
    expect(excerpt('pendek')).toBe('pendek');
  });
});

describe('formatNumber', () => {
  it('format Indonesia', () => {
    expect(formatNumber(1234567)).toBe('1.234.567');
  });
});
