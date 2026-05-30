import { test, expect } from '@playwright/test';

test('organizations list shows seeded shelters', async ({ page }) => {
  await page.goto('/organizations');
  await expect(page.getByText('Приют «Верный друг»')).toBeVisible();
});

test('organization profile shows its animals', async ({ page }) => {
  await page.goto('/organizations');
  await page.getByText('Приют «Верный друг»').click();
  await expect(page.getByRole('heading', { name: 'Приют «Верный друг»' })).toBeVisible();
  await expect(page.getByText('Питомцы организации')).toBeVisible();
  await expect(page.getByText('Рекс №', { exact: false })).toBeVisible();
});
