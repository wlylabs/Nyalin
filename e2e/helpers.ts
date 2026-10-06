import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Pemeriksaan aksesibilitas otomatis (axe) — hanya pelanggaran serius/kritis yang menggagalkan tes. */
export async function expectAccessible(page: Page) {
  // Tunggu animasi masuk selesai: elemen yang sedang fade-in terbaca kontrasnya rendah oleh axe.
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity),
  );
  // Action bar ponsel menempel di bawah layar; field yang kebetulan berada di baliknya akan dianggap
  // "tertutup" oleh aturan target-size tergantung posisi scroll. Saat dipindai, bar dibuat statis
  // (tombolnya tetap ikut diperiksa) supaya hasil tidak bergantung pada posisi scroll.
  const style = await page.addStyleTag({ content: '.action-bar { position: static !important; }' });
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  await style.evaluate((el) => (el as Element).remove());
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

/** Total nota (baris "Total" di ringkasan). */
export const notaTotal = (page: Page) => page.locator('.receipt-sum--total strong');
