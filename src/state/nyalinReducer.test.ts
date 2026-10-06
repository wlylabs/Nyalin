import { initialState, nyalinReducer, type NyalinState } from './nyalinReducer';

const image = {
  kind: 'image' as const,
  url: 'blob:x',
  name: 'catatan.jpg',
  size: 1200,
  duration: null,
  fromHistory: false,
};

describe('nyalinReducer', () => {
  it('menjalankan alur gambar → proses → hasil → edit', () => {
    let s: NyalinState = nyalinReducer(initialState, { type: 'select', media: image });
    expect(s.phase).toBe('selected');
    s = nyalinReducer(s, { type: 'start' });
    expect(s.phase).toBe('processing');
    s = nyalinReducer(s, { type: 'progress', progress: { stage: 'recognizing', progress: 0.5 } });
    expect(s.phase === 'processing' && s.progress.progress).toBe(0.5);
    s = nyalinReducer(s, { type: 'success', result: { text: 'halo', lowConfidence: false, historyId: 'h1' } });
    expect(s.phase).toBe('result');
    s = nyalinReducer(s, { type: 'edit', text: 'halo dunia' });
    expect(s.phase === 'result' && s.result.text).toBe('halo dunia');
  });

  it('error pemilihan file tidak membuang gambar yang sudah dipilih', () => {
    const selected = nyalinReducer(initialState, { type: 'select', media: image });
    const s = nyalinReducer(selected, { type: 'selection-error', code: 'too-large' });
    expect(s).toEqual({ phase: 'selected', media: image, language: 'id', selectionError: 'too-large' });
  });

  it('membatalkan proses kembali ke pratinjau', () => {
    let s = nyalinReducer(nyalinReducer(initialState, { type: 'select', media: image }), { type: 'start' });
    s = nyalinReducer(s, { type: 'cancel' });
    expect(s.phase).toBe('selected');
  });

  it('bisa mencoba lagi dari layar error, dan melihat hasil buram apa adanya', () => {
    let s = nyalinReducer(nyalinReducer(initialState, { type: 'select', media: image }), { type: 'start' });
    s = nyalinReducer(s, { type: 'fail', code: 'blurry', partialText: 'Rn ka' });
    expect(s.phase).toBe('error');
    expect(nyalinReducer(s, { type: 'start' }).phase).toBe('processing');
    const partial = nyalinReducer(s, { type: 'show-partial', historyId: null });
    expect(partial.phase === 'result' && partial.result).toEqual({
      text: 'Rn ka',
      lowConfidence: true,
      historyId: null,
    });
  });

  it('tidak memproses ulang thumbnail dari riwayat', () => {
    const s = nyalinReducer(initialState, {
      type: 'open',
      media: { ...image, fromHistory: true },
      result: { text: 'a', lowConfidence: false, historyId: 'h' },
    });
    expect(nyalinReducer(s, { type: 'start' })).toBe(s);
  });

  it('menyimpan pilihan bahasa ucapan sampai proses dimulai', () => {
    const audio = { ...image, kind: 'audio' as const, name: 'vn.opus', duration: 12 };
    let s = nyalinReducer(initialState, { type: 'select', media: audio });
    s = nyalinReducer(s, { type: 'set-language', language: 'en' });
    s = nyalinReducer(s, { type: 'start' });
    expect(s.phase === 'processing' && s.language).toBe('en');
  });
});
