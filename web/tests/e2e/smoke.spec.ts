import { test, expect } from '@playwright/test';

test('home page loads', async ({ page }) => {
  const res = await page.goto('/');
  expect(res?.ok()).toBeTruthy();
  await expect(page.locator('body')).toBeVisible();
  await expect(page).toHaveTitle(/Pet/i);
});

test('home page has header and footer', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
});

test('404 page renders for unknown route', async ({ page }) => {
  await page.goto('/nonexistent-page');
  await expect(page.getByText(/404|не найдено/i)).toBeVisible();
});
