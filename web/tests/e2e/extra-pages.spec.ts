import { test, expect } from '@playwright/test';

test('search page renders and accepts query', async ({ page }) => {
  await page.goto('/search?q=кот');
  await expect(page.getByRole('heading', { name: 'Поиск' })).toBeVisible();
});
test('lost-and-found renders with filters', async ({ page }) => {
  await page.goto('/lost-and-found');
  await expect(page.getByRole('heading', { name: 'Потеряны и найдены' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Потеряны', exact: true })).toBeVisible();
});
test('404 page has search and nav', async ({ page }) => {
  await page.goto('/no-such-page-xyz');
  await expect(page.getByRole('heading', { name: 'Страница не найдена' })).toBeVisible();
  await expect(page.getByPlaceholder('Искать животное…')).toBeVisible();
});
