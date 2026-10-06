import { formatDuration, formatDurationLong, isSilent, segmentAudio, validateAudioFile } from './audio';

const SR = 1000; // sample rate kecil agar tes cepat

function tone(seconds: number, amp = 0.5) {
  const a = new Float32Array(seconds * SR);
  for (let i = 0; i < a.length; i++) a[i] = amp * Math.sin(i / 3);
  return a;
}

describe('validateAudioFile', () => {
  it('menerima voice note WhatsApp (.opus tanpa MIME) dan format umum', () => {
    expect(validateAudioFile({ name: 'PTT-20260101-WA0001.opus', type: '', size: 9000 })).toBeNull();
    expect(validateAudioFile({ name: 'a.m4a', type: 'audio/x-m4a', size: 9000 })).toBeNull();
    expect(validateAudioFile({ name: 'a.ogg', type: 'audio/ogg', size: 9000 })).toBeNull();
  });

  it('menolak format yang tidak bisa didecode browser, file kosong, dan file besar', () => {
    expect(validateAudioFile({ name: 'rekaman.amr', type: 'audio/amr', size: 9000 })).toBe('unsupported');
    expect(validateAudioFile({ name: 'a.txt', type: 'text/plain', size: 9000 })).toBe('unsupported');
    expect(validateAudioFile({ name: 'a.mp3', type: 'audio/mpeg', size: 0 })).toBe('empty-file');
    expect(validateAudioFile({ name: 'a.mp3', type: 'audio/mpeg', size: 26 * 1024 * 1024 })).toBe('too-large');
  });
});

describe('formatDuration', () => {
  it('memformat menit:detik dan jam', () => {
    expect(formatDuration(5)).toBe('0:05');
    expect(formatDuration(83)).toBe('1:23');
    expect(formatDuration(3725)).toBe('1:02:05');
    expect(formatDurationLong(83)).toBe('1 menit 23 detik');
    expect(formatDurationLong(40)).toBe('40 detik');
  });
});

describe('isSilent', () => {
  it('membedakan hening dan suara', () => {
    expect(isSilent(new Float32Array(3 * SR), SR)).toBe(true);
    expect(isSilent(tone(3), SR)).toBe(false);
  });
});

describe('segmentAudio', () => {
  it('tidak memotong audio pendek', () => {
    const a = tone(10);
    expect(segmentAudio(a, SR)).toEqual([a]);
  });

  it('memotong di bagian sunyi dan tidak kehilangan sampel', () => {
    // 20 dtk suara, 1 dtk hening, 20 dtk suara → potongan pertama berakhir di area hening.
    const a = new Float32Array(41 * SR);
    a.set(tone(20), 0);
    a.set(tone(20), 21 * SR);
    const segments = segmentAudio(a, SR, { maxSeconds: 28, searchSeconds: 10 });
    expect(segments).toHaveLength(2);
    expect(segments[0].length).toBeGreaterThanOrEqual(20 * SR);
    expect(segments[0].length).toBeLessThanOrEqual(21 * SR);
    expect(segments.reduce((n, s) => n + s.length, 0)).toBe(a.length);
    for (const s of segments) expect(s.length).toBeLessThanOrEqual(28 * SR);
  });

  it('tetap membatasi panjang segmen saat tidak ada jeda', () => {
    const segments = segmentAudio(tone(100), SR);
    expect(segments.length).toBeGreaterThanOrEqual(4);
    for (const s of segments) expect(s.length).toBeLessThanOrEqual(28 * SR);
  });
});
