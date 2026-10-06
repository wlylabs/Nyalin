import { clientKey, createRateLimiter } from './rateLimit';

describe('createRateLimiter', () => {
  it('membatasi per kunci dalam jendela waktu', () => {
    const check = createRateLimiter({ limit: 2, windowMs: 60_000 });
    expect(check('a', 0).ok).toBe(true);
    expect(check('a', 1_000).ok).toBe(true);
    const blocked = check('a', 2_000);
    expect(blocked).toEqual({ ok: false, remaining: 0, retryAfter: 58 });
    expect(check('b', 2_000).ok).toBe(true);
    expect(check('a', 61_000).ok).toBe(true);
  });

  it('membuang kunci tertua saat melewati batas memori', () => {
    const check = createRateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 2 });
    check('a', 0);
    check('b', 0);
    check('c', 0); // "a" terbuang
    expect(check('a', 1).ok).toBe(true);
  });
});

describe('clientKey', () => {
  it('memakai IP pertama dari x-forwarded-for', () => {
    expect(clientKey(new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }))).toBe('1.2.3.4');
    expect(clientKey(new Headers({ 'x-real-ip': '5.6.7.8' }))).toBe('5.6.7.8');
    expect(clientKey(new Headers())).toBe('unknown');
  });
});
