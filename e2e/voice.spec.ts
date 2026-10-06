import { expect, test } from '@playwright/test';
import { audioInput, expectAccessible, inlineAlert, generated, mainButton } from './helpers';

test.describe('Voice note → teks', () => {
  test('upload voice note (mock), pilih bahasa, hasil berdurasi', async ({ page }) => {
    await page.goto('/?stt=mock');
    await page.getByRole('radio', { name: 'Voice note' }).click();
    await expect(page.getByRole('heading', { name: 'Belum ada voice note' })).toBeVisible();
    await expectAccessible(page);

    await audioInput(page).setInputFiles(generated('voice-note.wav'));
    await expect(page.getByRole('heading', { name: 'Cek voice note-nya dulu' })).toBeVisible();
    await page.getByLabel('Bahasa dalam voice note').selectOption('auto');
    await expectAccessible(page);

    await mainButton(page, 'Jadikan nota').click();
    await expect(page.getByText('Terdengar sejauh ini')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Nota', exact: true })).toBeVisible();
    await expect(page.getByText(/durasi 0:04/)).toBeVisible();
    await expectAccessible(page);
  });

  test('rekam langsung dengan mikrofon', async ({ page }) => {
    await page.goto('/?stt=mock');
    await page.getByRole('radio', { name: 'Voice note' }).click();
    await page.getByRole('button', { name: 'Rekam suara' }).filter({ visible: true }).first().click();
    await expect(page.getByText('Sedang merekam')).toBeVisible();
    await expect(page.getByRole('timer')).toHaveText('0:02', { timeout: 5000 });
    await page.getByRole('button', { name: 'Selesai' }).click();
    await expect(page.getByRole('heading', { name: 'Cek voice note-nya dulu' })).toBeVisible();
    await expect(page.getByText(/^Rekaman .+\.(webm|m4a|ogg)$/)).toBeVisible();
  });

  test('audio hening ditolak sebelum memuat model', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('radio', { name: 'Voice note' }).click();
    await audioInput(page).setInputFiles(generated('hening.wav'));
    await mainButton(page, 'Jadikan nota').click();
    await expect(page.getByRole('heading', { name: 'Tidak ada ucapan yang terdengar' })).toBeVisible();
  });

  test('format audio yang tidak bisa didecode browser', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('radio', { name: 'Voice note' }).click();
    await audioInput(page).setInputFiles({ name: 'rekaman.amr', mimeType: 'audio/amr', buffer: Buffer.from('#!AMR') });
    await expect(inlineAlert(page)).toContainText('Format audio belum didukung');
  });
});
