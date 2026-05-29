import { test, expect } from '@playwright/test';

test('register page renders form', async ({ page }) => {
  await page.goto('/register');
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/пароль/i).first()).toBeVisible();
  await expect(page.getByText(/мне 14 лет/i)).toBeVisible();
  await expect(page.getByText(/согласие/i)).toBeVisible();
});

test('login page shows both email and telegram options', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByText(/войти через telegram/i)).toBeVisible();
});
