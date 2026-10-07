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
