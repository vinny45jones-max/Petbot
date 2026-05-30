import { test, expect } from '@playwright/test';

test('urgent page groups urgent animals by city', async ({ page }) => {
  await page.goto('/animals/urgent');
  await expect(page.getByRole('heading', { name: 'Срочно нужен дом' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Минск' })).toBeVisible();
  await expect(page.getByText(/Осталось \d+ дн\./).first()).toBeVisible();
});
