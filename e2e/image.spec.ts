import { expect, test } from '@playwright/test';
import { expectAccessible, inlineAlert, fixture, imageInput, mainButton } from './helpers';

test.describe('Gambar → teks', () => {
  test('OCR asli di perangkat: pilih, baca, salin, riwayat', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ubah gambar dan suara jadi tulisan.');
    await expectAccessible(page);

    await imageInput(page).setInputFiles(fixture('catatan-belanja.png'));
    await expect(page.getByRole('heading', { name: 'Cek gambarnya dulu' })).toBeVisible();
    await expect(page.getByText('catatan-belanja.png')).toBeVisible();
    await expectAccessible(page);

    await mainButton(page, 'Mulai Nyalin').click();
    await expect(page.getByRole('heading', { name: 'Hasil Nyalin' })).toBeVisible({ timeout: 45_000 });
    const editor = page.getByRole('textbox', { name: /Teks hasil Nyalin/ });
    await expect(editor).toHaveValue(/Catatan Belanja/);
    await expect(editor).toHaveValue(/Rp250\.000/);
    await expect(page.getByText(/\d+ kata · \d+ karakter/)).toBeVisible();
    await expectAccessible(page);

    await page.getByRole('button', { name: 'Salin teks' }).filter({ visible: true }).first().click();
    await expect(page.getByRole('status').filter({ hasText: 'Teks berhasil disalin.' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Catatan Belanja');

    await editor.fill('Teks yang sudah dikoreksi');
    await page.getByRole('link', { name: 'Riwayat' }).click();
    await expect(page).toHaveURL(/\/riwayat$/);
    await expect(page.getByText('Teks yang sudah dikoreksi')).toBeVisible();
    await expectAccessible(page);
  });

  test('format tidak didukung ditampilkan di tempat', async ({ page }) => {
    await page.goto('/');
    await imageInput(page).setInputFiles({
      name: 'dokumen.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF'),
    });
    await expect(inlineAlert(page)).toContainText('Format gambar belum didukung');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ubah gambar dan suara jadi tulisan.');
  });

  test('tulisan buram → bisa lihat hasil apa adanya', async ({ page }) => {
    await page.goto('/?ocr=mock');
    await imageInput(page).setInputFiles({
      name: 'foto-buram.png',
      mimeType: 'image/png',
      buffer: await import('node:fs').then((fs) => fs.readFileSync(fixture('catatan-belanja.png'))),
    });
    await mainButton(page, 'Mulai Nyalin').click();
    await expect(page.getByRole('heading', { name: 'Belum bisa membaca tulisan' })).toBeVisible();
    await expectAccessible(page);
    await page.getByRole('button', { name: 'Lihat hasil apa adanya' }).click();
    await expect(page.getByText('Periksa lagi hasilnya')).toBeVisible();
  });

  test('batalkan saat proses kembali ke pratinjau', async ({ page }) => {
    await page.goto('/?ocr=mock');
    await imageInput(page).setInputFiles(fixture('catatan-belanja.png'));
    await mainButton(page, 'Mulai Nyalin').click();
    await page.getByRole('button', { name: 'Batalkan' }).click();
    await expect(page.getByRole('heading', { name: 'Cek gambarnya dulu' })).toBeVisible();
    // Bisa langsung dimulai lagi (tidak ada proses yang menggantung).
    await mainButton(page, 'Mulai Nyalin').click();
    await expect(page.getByRole('heading', { name: 'Hasil Nyalin' })).toBeVisible();
  });
});
