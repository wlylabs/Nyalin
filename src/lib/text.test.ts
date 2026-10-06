import { countCharacters, countWords, excerpt, tidyOcrText } from './text';

describe('countWords / countCharacters', () => {
  it('menghitung kata dengan spasi & baris baru tak beraturan', () => {
    expect(countWords('  Beras 5 kg,\n\nminyak   goreng ')).toBe(5);
    expect(countWords('   ')).toBe(0);
  });

  it('menghitung karakter per grapheme', () => {
    expect(countCharacters('kafé')).toBe(4);
  });
});

describe('tidyOcrText', () => {
  it('merapikan spasi, tanda baca, dan baris kosong berlebih', () => {
    expect(tidyOcrText('Halo  ,  dunia !\r\n\n\n\nBaris   dua  ')).toBe('Halo, dunia!\n\nBaris dua');
  });

  it('menyambung kata yang terpotong tanda hubung di akhir baris', () => {
    expect(tidyOcrText('Ekosis-\ntem adalah')).toBe('Ekosistem adalah');
  });

  it('menyambung baris paragraf panjang yang terbungkus', () => {
    const raw = 'Ekosistem adalah hubungan timbal balik antara makhluk\nhidup dengan lingkungannya.';
    expect(tidyOcrText(raw)).toBe('Ekosistem adalah hubungan timbal balik antara makhluk hidup dengan lingkungannya.');
  });

  it('tidak menyambung daftar pendek', () => {
    expect(tidyOcrText('beras 5 kg\ngula pasir\ntelur')).toBe('beras 5 kg\ngula pasir\ntelur');
  });
});

describe('excerpt', () => {
  it('memotong di batas kata', () => {
    expect(excerpt('satu dua tiga empat', 12)).toBe('satu dua…');
    expect(excerpt('pendek')).toBe('pendek');
  });
});

import { tidyTranscript } from './text';

describe('tidyTranscript', () => {
  it('membuang label non-ucapan dan merapikan spasi', () => {
    expect(tidyTranscript(' [Musik]  Halo ,  apa kabar ? (tertawa) ')).toBe('Halo, apa kabar?');
  });

  it('mengelompokkan kalimat menjadi paragraf', () => {
    expect(tidyTranscript('Satu. Dua. Tiga.', 2)).toBe('Satu. Dua.\n\nTiga.');
  });

  it('mengembalikan string kosong bila tidak ada ucapan', () => {
    expect(tidyTranscript(' [Musik] ♪ ')).toBe('');
  });
});
