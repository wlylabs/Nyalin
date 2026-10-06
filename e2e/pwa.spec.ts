import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fixture } from './helpers';

test.describe('PWA', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'CDP & share target khusus Chromium');

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
    expect(json.share_target.params.files[0].accept).toEqual(
      expect.arrayContaining(['image/jpeg', 'audio/*', '.opus']),
    );
    expect(json.screenshots.map((s: { form_factor: string }) => s.form_factor)).toEqual(
      expect.arrayContaining(['narrow', 'wide']),
    );
  });

  test('menerima file dari menu Bagikan (share target)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => (await navigator.serviceWorker.ready).active);
    await page.reload();
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

    const bytes = [...readFileSync(fixture('catatan-belanja.png'))];
    await page.evaluate(async (arr) => {
      const form = new FormData();
      form.append('media', new File([new Uint8Array(arr)], 'dari-whatsapp.png', { type: 'image/png' }));
      await fetch('/share-target', { method: 'POST', body: form, redirect: 'manual' });
    }, bytes);

    await page.goto('/?shared=1');
    await expect(page.getByRole('heading', { name: 'Cek fotonya dulu' })).toBeVisible();
    await expect(page.getByText('dari-whatsapp.png')).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test('API transkripsi menolak permintaan lintas situs', async ({ request }) => {
    const res = await request.post('/api/transcribe', { headers: { Origin: 'https://situs-lain.example' } });
    expect(res.status()).toBe(403);
  });
});
