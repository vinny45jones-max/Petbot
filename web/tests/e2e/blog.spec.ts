import { test, expect } from '@playwright/test';

test('blog list renders', async ({ page }) => {
  await page.goto('/blog');
  await expect(page.getByRole('heading', { name: 'Блог' })).toBeVisible();
});
test('success stories page renders', async ({ page }) => {
  await page.goto('/success-stories');
  await expect(page.getByRole('heading', { name: 'Истории успеха' })).toBeVisible();
});
