import { test, expect } from '@playwright/test';

test('home shows hero and sections', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Найдите друга/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Свежие объявления' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Найти питомца' })).toBeVisible();
});
