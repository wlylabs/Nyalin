import { expect, test } from '@playwright/test';

test.describe('PWA', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'CDP khusus Chromium');

  test('memenuhi kriteria instal & service worker aktif', async ({ page, context }) => {
    await page.goto('/');
    const state = await page.evaluate(async () => (await navigator.serviceWorker.ready).active?.state);
    expect(['activating', 'activated']).toContain(state);

    const cdp = await context.newCDPSession(page);
    const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
    expect(installabilityErrors).toEqual([]);
    const manifest = await cdp.send('Page.getAppManifest');
    expect(manifest.errors).toEqual([]);

    const json = await (await page.request.get('/manifest.webmanifest')).json();
    expect(json.name).toBe('Nyalin — Nota digital');
    expect(json.share_target).toBeUndefined();
    expect(json.screenshots.map((s: { form_factor: string }) => s.form_factor)).toEqual(
      expect.arrayContaining(['narrow', 'wide']),
    );
  });

  test('nota tetap bisa dibuat saat offline', async ({ page, context }) => {
    await page.goto('/');
    await page.evaluate(async () => (await navigator.serviceWorker.ready).active);
    await page.reload();
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

    await context.setOffline(true);
    await page.reload();
    await page.getByRole('textbox', { name: 'Nama barang 1' }).fill('Teh botol');
    await page.getByRole('textbox', { name: 'Harga satuan barang 1, rupiah' }).fill('5000');
    await expect(page.locator('.receipt-sum--total strong')).toHaveText('Rp5.000');
    await context.setOffline(false);
  });
});
