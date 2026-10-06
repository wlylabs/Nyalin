import { expect, test } from '@playwright/test';
import { expectAccessible, inlineAlert, fixture, imageInput, mainButton } from './helpers';

test.describe('Gambar → teks', () => {
  test('OCR asli di perangkat: pilih, baca, salin, riwayat', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Foto struk atau sebut belanjaan, langsung jadi nota.',
    );
    await expectAccessible(page);

    await imageInput(page).setInputFiles(fixture('catatan-belanja.png'));
    await expect(page.getByRole('heading', { name: 'Cek fotonya dulu' })).toBeVisible();
    await expect(page.getByText('catatan-belanja.png')).toBeVisible();
    await expectAccessible(page);

    await mainButton(page, 'Jadikan nota').click();
    await expect(page.getByRole('heading', { name: 'Nota', exact: true })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('textbox', { name: 'Nama barang 1' })).toHaveValue('Beras 5 kg');
    await expect(page.getByText(/^\d+ barang/)).toBeVisible();
    await expectAccessible(page);

    await page
      .getByRole('button', { name: /^Salin( nota)?$/ })
      .filter({ visible: true })
      .first()
      .click();
    await expect(page.getByRole('status').filter({ hasText: 'Nota berhasil disalin.' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Beras 5 kg');

    await page.getByRole('textbox', { name: 'Nama barang 1' }).fill('Beras pandan wangi 5 kg');
    await page.getByRole('link', { name: 'Riwayat' }).click();
    await expect(page).toHaveURL(/\/riwayat$/);
    await expect(page.getByText(/^Beras pandan wangi 5 kg, Minyak goreng/)).toBeVisible();
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
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Foto struk atau sebut belanjaan, langsung jadi nota.',
    );
  });

  test('tulisan buram → bisa lihat hasil apa adanya', async ({ page }) => {
    await page.goto('/?ocr=mock');
    await imageInput(page).setInputFiles({
      name: 'foto-buram.png',
      mimeType: 'image/png',
      buffer: await import('node:fs').then((fs) => fs.readFileSync(fixture('catatan-belanja.png'))),
    });
    await mainButton(page, 'Jadikan nota').click();
    await expect(page.getByRole('heading', { name: 'Belum bisa membaca tulisan' })).toBeVisible();
    await expectAccessible(page);
    await page.getByRole('button', { name: 'Lihat hasil apa adanya' }).click();
    await expect(page.getByText('Periksa lagi hasilnya')).toBeVisible();
  });

  test('batalkan saat proses kembali ke pratinjau', async ({ page }) => {
    await page.goto('/?ocr=mock');
    await imageInput(page).setInputFiles(fixture('catatan-belanja.png'));
    await mainButton(page, 'Jadikan nota').click();
    await page.getByRole('button', { name: 'Batalkan' }).click();
    await expect(page.getByRole('heading', { name: 'Cek fotonya dulu' })).toBeVisible();
    // Bisa langsung dimulai lagi (tidak ada proses yang menggantung).
    await mainButton(page, 'Jadikan nota').click();
    await expect(page.getByRole('heading', { name: 'Nota', exact: true })).toBeVisible();
  });
});
