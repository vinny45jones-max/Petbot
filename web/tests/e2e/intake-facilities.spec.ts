import { test, expect } from '@playwright/test';

test('intake facilities list shows Minsk facility', async ({ page }) => {
  await page.goto('/intake-facilities');
  await expect(page.getByText('ГУ «Фауна города»', { exact: false })).toBeVisible();
});

test('facility page shows hold-days and its animals', async ({ page }) => {
  await page.goto('/intake-facilities');
  await page.getByText('ГУ «Фауна города»', { exact: false }).click();
  await expect(page.getByText(/Срок содержания по закону/)).toBeVisible();
  await expect(page.getByText('Животные в этой службе')).toBeVisible();
});
