import { test, expect } from '@playwright/test';

test('inquiry API requires auth', async ({ request }) => {
  const r = await request.post('/api/inquiries', { data: { animalId: '1', message: 'hi' } });
  expect(r.status()).toBe(401);
});

test('adopt button opens modal on animal page', async ({ page }) => {
  await page.goto('/animals?species=cat'); // Мурка — не из службы отлова
  await page.getByText('Мурка №', { exact: false }).first().click();
  await page.getByRole('button', { name: 'Хочу взять домой' }).click();
  await expect(page.getByRole('dialog', { name: 'Заявка на усыновление' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Заявка на усыновление' })).toBeVisible();
});

test('intake-facility animal exposes adoption CTA (ФИКС 1)', async ({ page }) => {
  await page.goto('/animals?urgent=1'); // «Безымянный» — из службы отлова (seed Plan 2)
  await page.getByText(/Осталось \d+ дн\./).first().click();
  await expect(page.getByText('В службе отлова')).toBeVisible();
  // ключевое: у intake-животного есть рабочая кнопка заявки, открывающая модалку
  await page.getByRole('button', { name: 'Забрать из службы отлова' }).click();
  await expect(page.getByRole('dialog', { name: 'Заявка на усыновление' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Заявка на усыновление' })).toBeVisible();
});

// Регрессия: на проде POST /api/inquiries отвечал 500 — прежние тесты только открывали окно, но не отправляли форму
test('citizen submits an adoption inquiry and sees it in the cabinet', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').first().fill('citizen-inquiry@test.local');
  await page.getByLabel('Пароль').fill('Test12345!');
  await page.getByRole('button', { name: /Войти/ }).first().click();
  await expect(page).toHaveURL(/\/me|\/$/, { timeout: 15_000 });

  await page.goto('/animals?species=cat');
  await page.getByText('Мурка №', { exact: false }).first().click();
  await page.getByRole('button', { name: 'Хочу взять домой' }).click();
  const dialog = page.getByRole('dialog', { name: 'Заявка на усыновление' });
  await dialog.getByPlaceholder('Коротко о себе и почему хотите взять').fill('Хочу взять Мурку, есть опыт с кошками.');
  await dialog.getByPlaceholder('Телефон').fill('+375291112233');
  await dialog.getByRole('button', { name: 'Отправить' }).click();
  await expect(dialog.getByText('Заявка отправлена')).toBeVisible({ timeout: 15_000 });

  await page.goto('/me/inquiries');
  await expect(page.getByText('Мурка', { exact: false }).first()).toBeVisible();
});
