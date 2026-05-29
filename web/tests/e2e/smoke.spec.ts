import { test, expect } from '@playwright/test';

// TODO(Task 3): assert toHaveTitle(/Pet/i) once metadata is set
test('home page loads', async ({ page }) => {
  const res = await page.goto('/');
  expect(res?.ok()).toBeTruthy();
  await expect(page.locator('body')).toBeVisible();
});
