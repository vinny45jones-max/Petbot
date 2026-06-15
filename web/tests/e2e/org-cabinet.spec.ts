import { test, expect } from '@playwright/test';

test('/me redirects anonymous to login', async ({ page }) => {
  await page.goto('/me');
  await expect(page).toHaveURL(/\/login/);
});
