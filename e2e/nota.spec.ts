import { expect, test, type Page } from '@playwright/test';
import { expectAccessible, notaTotal } from './helpers';

async function fillItem(page: Page, n: number, qty: string, name: string, price: string) {
  await page.getByRole('textbox', { name: `Jumlah barang ${n}` }).fill(qty);
  await page.getByRole('combobox', { name: `Nama barang ${n}` }).fill(name);
  await page.getByRole('textbox', { name: `Harga satuan barang ${n}, rupiah` }).fill(price);
}

test.describe('Nota digital', () => {
  test('langsung isi nota: tanggal & nomor otomatis, total, salin, riwayat', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Nota', exact: true })).toBeVisible();
    await expect(page.locator('.receipt__auto')).toHaveText(/^No\. 0001 · \d+ \w+ \d{4}$/);
    await expect(page.getByRole('combobox', { name: 'Nama barang 1' })).toBeVisible();
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
      await expect(page.getByRole('combobox', { name: `Nama barang ${n}` })).toBeFocused();
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
    await expect(page.getByRole('combobox', { name: 'Nama barang 2' })).toHaveValue('Sabun cuci');
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
    await expect(page.getByRole('combobox', { name: 'Nama barang 1' })).toHaveValue('');
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

    await page.getByRole('combobox', { name: 'Nama barang 1' }).fill('Teh botol');
    for (const name of actions) {
      await expect(page.getByRole('button', { name }).filter({ visible: true }).first()).toBeEnabled();
    }
    await expect(page.getByText(/Isi minimal satu barang/)).toBeHidden();
  });

  test('barang tersimpan: diingat otomatis, disarankan saat mengetik, tinggal klik', async ({ page }) => {
    await page.goto('/');
    const shortcuts = page.getByRole('region', { name: 'Barang tersimpan' });
    await expect(shortcuts.getByText(/otomatis tersimpan di sini/)).toBeVisible();

    await fillItem(page, 1, '1', 'Beras 5 kg', '65000');
    await page.getByRole('textbox', { name: 'Kepada' }).click();
    await expect(shortcuts.getByRole('button', { name: 'Tambah Beras 5 kg Rp65.000' })).toBeVisible();

    // Nota baru: klik barang tersimpan mengisi baris kosong beserta harganya; klik lagi menambah jumlah.
    await page.getByRole('button', { name: 'Nota baru' }).filter({ visible: true }).first().click();
    await shortcuts.getByRole('button', { name: /^Tambah Beras 5 kg/ }).click();
    await expect(page.getByRole('combobox', { name: 'Nama barang 1' })).toHaveValue('Beras 5 kg');
    await expect(page.getByRole('textbox', { name: 'Harga satuan barang 1, rupiah' })).toHaveValue('Rp65.000');
    await shortcuts.getByRole('button', { name: /^Tambah Beras 5 kg/ }).click();
    await expect(page.getByRole('textbox', { name: 'Jumlah barang 1' })).toHaveValue('2');
    await expect(notaTotal(page)).toHaveText('Rp130.000');

    // Saran muncul saat mengetik; dipilih dengan keyboard.
    await page.getByRole('button', { name: 'Tambah barang' }).click();
    const name2 = page.getByRole('combobox', { name: 'Nama barang 2' });
    await page.keyboard.type('ber');
    await expect(name2).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('option', { name: /Beras 5 kg/ })).toBeVisible();
    await expectAccessible(page);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(name2).toHaveValue('Beras 5 kg');
    await expect(name2).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('textbox', { name: 'Harga satuan barang 2, rupiah' })).toHaveValue('Rp65.000');

    // Kelola daftar barang: tulis & simpan barang baru, hapus, urungkan.
    await shortcuts.getByRole('button', { name: 'Kelola' }).click();
    const dialog = page.getByRole('dialog', { name: 'Daftar barang' });
    await dialog.getByRole('textbox', { name: 'Nama barang', exact: true }).fill('Telur 1 kg');
    await dialog.getByRole('textbox', { name: 'Harga', exact: true }).fill('28000');
    await dialog.getByRole('button', { name: 'Simpan' }).click();
    await expect(dialog.getByRole('status')).toHaveText('Telur 1 kg disimpan.');
    await expect(dialog.getByRole('textbox', { name: 'Harga Telur 1 kg, rupiah' })).toHaveValue('Rp28.000');
    await expectAccessible(page);
    await dialog.getByRole('button', { name: 'Hapus Telur 1 kg dari daftar' }).click();
    await expect(dialog.getByText('Telur 1 kg', { exact: true })).toBeHidden();
    await dialog.getByRole('button', { name: 'Urungkan' }).click();
    await dialog.getByRole('button', { name: 'Tambah Telur 1 kg ke nota' }).click();
    await dialog.getByRole('button', { name: 'Tutup' }).click();
    await expect(page.getByRole('combobox', { name: 'Nama barang 3' })).toHaveValue('Telur 1 kg');

    // Tersimpan di perangkat: tetap ada setelah dimuat ulang.
    await page.reload();
    await expect(shortcuts.getByRole('button', { name: /^Tambah Telur 1 kg/ })).toBeVisible();
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
    await expect(page.getByRole('combobox', { name: 'Nama barang 1' })).toBeVisible();
  });
});
