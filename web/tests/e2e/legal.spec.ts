import { test, expect } from '@playwright/test';

test('legal hub renders', async ({ page }) => {
  await page.goto('/legal');
  await expect(page.getByRole('heading', { name: 'Юридический раздел' })).toBeVisible();
});
test('intake-rights article renders (seeded)', async ({ page }) => {
  await page.goto('/legal/municipal-intake-rights');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('службу отлова');
});
