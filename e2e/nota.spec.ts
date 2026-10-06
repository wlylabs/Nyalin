import { expect, test, type Page } from '@playwright/test';
import { expectAccessible, notaTotal } from './helpers';

async function fillItem(page: Page, n: number, qty: string, name: string, price: string) {
  await page.getByRole('textbox', { name: `Jumlah barang ${n}` }).fill(qty);
  await page.getByRole('textbox', { name: `Nama barang ${n}` }).fill(name);
  await page.getByRole('textbox', { name: `Harga satuan barang ${n}, rupiah` }).fill(price);
}

test.describe('Nota digital', () => {
  test('langsung isi nota: tanggal & nomor otomatis, total, salin, riwayat', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Nota', exact: true })).toBeVisible();
    await expect(page.locator('.receipt__auto')).toHaveText(/^No\. 0001 · \d+ \w+ \d{4}$/);
    await expect(page.getByRole('textbox', { name: 'Nama barang 1' })).toBeVisible();
    await expectAccessible(page);

    // Membuka aplikasi tanpa mengisi apa pun tidak menghabiskan nomor nota.
    await page.reload();
    await expect(page.locator('.receipt__auto')).toHaveText(/^No\. 0001 · /);

    await page.getByRole('textbox', { name: 'Nama toko', exact: true }).fill('Warung Bu Sri');
    await fillItem(page, 1, '2', 'Beras 5 kg', '65000');
    await expect(page.getByRole('status', { name: 'Subtotal barang 1' })).toHaveText('Rp130.000');
    for (const [n, name, price] of [
      [2, 'Kopi bubuk', '12000'],
      [3, 'Sabun cuci', '4.500'],
    ] as const) {
      await page.getByRole('button', { name: 'Tambah barang' }).click();
      await expect(page.getByRole('textbox', { name: `Nama barang ${n}` })).toBeFocused();
      await page.keyboard.type(name);
      await page.getByRole('textbox', { name: `Harga satuan barang ${n}, rupiah` }).fill(price);
    }
    const items = page.getByRole('list', { name: 'Daftar barang' }).getByRole('listitem');
    await expect(items).toHaveCount(3);
    await page.getByRole('button', { name: 'Hapus Kopi bubuk' }).click();
    await expect(items).toHaveCount(2);
    await expect(page.getByText(/Subtotal\s*\(2 barang\)/)).toBeVisible();
    await expect(notaTotal(page)).toHaveText('Rp134.500');
    await expectAccessible(page);

    await page
      .getByRole('button', { name: /^Salin( nota)?$/ })
      .filter({ visible: true })
      .first()
      .click();
    await expect(page.getByRole('status').filter({ hasText: 'Nota berhasil disalin.' })).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('*Warung Bu Sri*');
    expect(copied).toContain('Nota No. 0001 · ');
    expect(copied).toContain('2 × Rp65.000 = Rp130.000');
    expect(copied).toContain('*TOTAL (2 barang): Rp134.500*');

    // Nota tersimpan otomatis di riwayat dan bisa dibuka lagi.
    await page.getByRole('link', { name: 'Riwayat' }).click();
    await expect(page).toHaveURL(/\/riwayat$/);
    await expect(page.getByText(/No\. 0001 · Rp134\.500/)).toBeVisible();
    await expect(page.getByText('Beras 5 kg, Sabun cuci')).toBeVisible();
    await expectAccessible(page);
    await page.getByRole('button', { name: /^Warung Bu Sri/ }).click();
    await expect(page.getByRole('textbox', { name: 'Nama barang 2' })).toHaveValue('Sabun cuci');
  });

  test('diskon, bayar & kembalian, profil toko diingat, simpan gambar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('textbox', { name: 'Nama toko', exact: true }).fill('Toko Berkah');
    await page.getByRole('textbox', { name: 'Kepada' }).fill('Bu Ani');
    await fillItem(page, 1, '10', 'Kopi sachet', '1500');
    await page.getByRole('textbox', { name: 'Diskon' }).fill('1000');
    await expect(notaTotal(page)).toHaveText('Rp14.000');
    await page.getByRole('textbox', { name: 'Bayar' }).fill('10000');
    await expect(page.locator('.receipt-sum', { hasText: 'Kurang' })).toContainText('Rp4.000');
    await page.getByRole('textbox', { name: 'Bayar' }).fill('20000');
    await expect(page.locator('.receipt-sum', { hasText: 'Kembali' })).toContainText('Rp6.000');

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Simpan gambar' }).click();
    expect((await download).suggestedFilename()).toBe('nota-0001-toko-berkah.png');

    // Nota berikutnya: nama toko terisi otomatis, nomor bertambah, isi lain kosong.
    await page.getByRole('button', { name: 'Nota baru' }).filter({ visible: true }).first().click();
    await expect(page.getByRole('textbox', { name: 'Nama toko', exact: true })).toHaveValue('Toko Berkah');
    await expect(page.locator('.receipt__auto')).toHaveText(/^No\. 0002 · /);
    await expect(page.getByRole('textbox', { name: 'Kepada' })).toHaveValue('');
    await expect(page.getByRole('textbox', { name: 'Nama barang 1' })).toHaveValue('');
  });

  test('nota kosong tidak bisa disimpan sebagai gambar, dibagikan, disalin, atau dicetak', async ({ page }) => {
    await page.goto('/');
    // Nama toko & jumlah saja belum dianggap isi nota.
    await page.getByRole('textbox', { name: 'Nama toko', exact: true }).fill('Toko Berkah');
    await page.getByRole('textbox', { name: 'Jumlah barang 1' }).fill('3');
    const actions = ['Simpan gambar', 'Cetak / PDF', /^Salin( nota)?$/, 'Bagikan'] as const;
    for (const name of actions) {
      const button = page.getByRole('button', { name }).filter({ visible: true }).first();
      await expect(button).toBeDisabled();
    }
    await expect(page.getByText(/Isi minimal satu barang/)).toBeVisible();

    await page.getByRole('textbox', { name: 'Nama barang 1' }).fill('Teh botol');
    for (const name of actions) {
      await expect(page.getByRole('button', { name }).filter({ visible: true }).first()).toBeEnabled();
    }
    await expect(page.getByText(/Isi minimal satu barang/)).toBeHidden();
  });

  test('tombol "Nota baru" hanya satu yang tampil', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Nota baru' }).filter({ visible: true })).toHaveCount(1);
  });

  test('riwayat kosong mengarah ke nota baru', async ({ page }) => {
    await page.goto('/riwayat');
    await expect(page.getByText('Belum ada riwayat')).toBeVisible();
    await page.getByRole('main').getByRole('button', { name: 'Nota baru' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('textbox', { name: 'Nama barang 1' })).toBeVisible();
  });
});
