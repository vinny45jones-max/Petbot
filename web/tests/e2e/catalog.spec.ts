import { test, expect } from '@playwright/test';

test('catalog lists seeded animals', async ({ page }) => {
  await page.goto('/animals');
  await expect(page.getByRole('heading', { name: 'Животные ищут дом' })).toBeVisible();
  await expect(page.getByText('Рекс №', { exact: false })).toBeVisible();
});

test('catalog filters by species via URL', async ({ page }) => {
  await page.goto('/animals?species=cat');
  await expect(page.getByText('Мурка №', { exact: false })).toBeVisible();
  await expect(page.getByText('Рекс №', { exact: false })).toHaveCount(0);
});

test('urgent animal shows countdown badge', async ({ page }) => {
  await page.goto('/animals?urgent=1');
  await expect(page.getByText(/Осталось \d+ дн\./).first()).toBeVisible();
});
