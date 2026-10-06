import { expect, test } from '@playwright/test';
import { expectAccessible, fixture, imageInput, mainButton } from './helpers';

test.describe('Nota digital', () => {
  test('hasil langsung jadi nota: jumlah, nama barang, harga, total', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    await imageInput(page).setInputFiles(fixture('catatan-belanja.png'));
    await mainButton(page, 'Mulai Nyalin').click();
    await expect(page.getByRole('heading', { name: 'Hasil Nyalin' })).toBeVisible({ timeout: 45_000 });

    const items = page.getByRole('list', { name: 'Daftar barang' }).getByRole('listitem');
    await expect(items).toHaveCount(5);
    await expect(page.getByRole('textbox', { name: 'Nama barang 1' })).toHaveValue('Beras 5 kg');
    await expectAccessible(page);

    // Catatan belanja belum ada harganya → isi sendiri, total ikut berubah.
    await page.getByRole('textbox', { name: 'Harga satuan barang 1, rupiah' }).fill('65000');
    await page.getByRole('textbox', { name: 'Jumlah barang 1' }).fill('2');
    await expect(page.getByRole('status', { name: 'Subtotal barang 1' })).toHaveText('Rp130.000');
    await page.getByRole('textbox', { name: 'Nama toko atau keterangan nota' }).fill('Warung Bu Sri');

    await page.getByRole('button', { name: 'Hapus Kopi bubuk' }).click();
    await expect(items).toHaveCount(4);
    await page.getByRole('button', { name: 'Tambah barang' }).click();
    await expect(page.getByRole('textbox', { name: 'Nama barang 5' })).toBeFocused();
    await page.keyboard.type('Sabun cuci');
    await page.getByRole('textbox', { name: 'Harga satuan barang 5, rupiah' }).fill('4.500');
    await expect(page.getByText(/Total\s*\(5 barang\)/)).toBeVisible();
    await expect(page.locator('.receipt__total strong')).toHaveText('Rp134.500');

    await page.getByRole('button', { name: 'Salin nota' }).filter({ visible: true }).first().click();
    await expect(page.getByRole('status').filter({ hasText: 'Nota berhasil disalin.' })).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('NOTA — Warung Bu Sri');
    expect(copied).toContain('2 × Rp65.000 = Rp130.000');
    expect(copied).toContain('TOTAL (5 barang): Rp134.500');

    // Nota ikut tersimpan di riwayat dan terbuka lagi di tab Nota.
    await page.getByRole('link', { name: 'Riwayat' }).click();
    await expect(page.getByText(/Nota Rp134\.500/)).toBeVisible();
    await page.getByRole('button', { name: /^catatan-belanja/ }).click();
    await expect(page.getByRole('textbox', { name: 'Nama barang 5' })).toHaveValue('Sabun cuci');
  });
});
