import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fileURLToPath } from 'node:url';

export const fixture = (name: string) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
export const generated = (name: string) => fileURLToPath(new URL(`./fixtures/.generated/${name}`, import.meta.url));

/** WAV PCM 16-bit mono 16 kHz. */
export function makeWav(seconds: number, sample: (t: number) => number): Buffer {
  const rate = 16_000;
  const n = Math.floor(seconds * rate);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++)
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample(i / rate))) * 32767), 44 + i * 2);
  return buf;
}

/** Input file tersembunyi: 0 = gambar, 1 = kamera, 2 = audio (lihat FilePicker). */
export const imageInput = (page: Page) => page.locator('input[type=file]').nth(0);
export const audioInput = (page: Page) => page.locator('input[type=file]').nth(2);

/** Tombol utama di dalam <main> (navbar juga punya "Mulai Nyalin"). */
export const mainButton = (page: Page, name: string) => page.locator('main').getByRole('button', { name, exact: true });

/** Tidak boleh ada pelanggaran aksesibilitas tingkat serius/kritis (WCAG 2.2 A/AA). */
export async function expectAccessible(page: Page) {
  // Tunggu animasi masuk selesai: elemen yang sedang fade-in terbaca kontrasnya rendah oleh axe.
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity),
  );
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

/** Pesan error di dalam alur (Next.js juga punya route announcer ber-role alert). */
export const inlineAlert = (page: Page) => page.locator('.inline-alert[role=alert]');
