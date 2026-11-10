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

// Регрессия с прода: шапка показывала «Войти» залогиненному, а «Помочь» вела на 404
test('header shows cabinet link when logged in and has no dead links', async ({ page, request }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Главная навигация' });
  for (const href of await nav.getByRole('link').evaluateAll((els) => els.map((e) => e.getAttribute('href')))) {
    expect((await request.get(href!)).status(), href!).toBe(200);
  }
  await page.goto('/login');
  await page.getByLabel('Email').first().fill('citizen@test.local');
  await page.getByLabel('Пароль').fill('Test12345!');
  await page.getByRole('button', { name: /Войти/ }).first().click();
  await expect(page).toHaveURL(/\/me|\/$/, { timeout: 15_000 });
  await expect(nav.getByRole('link', { name: 'Кабинет' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Войти' })).toHaveCount(0);
});

// Регрессия с прода: без почтового сервиса запрос ссылки для существующего адреса отвечал 500
test('magic-link request answers ok for existing and unknown emails alike', async ({ request }) => {
  for (const email of ['citizen@test.local', 'nobody@test.local']) {
    const r = await request.post('/api/auth/magic-link/request', { data: { email } });
    expect(r.status(), email).toBe(200);
  }
});
