import { test, expect } from '@playwright/test';

test('help hub shows three ways to help', async ({ page }) => {
  await page.goto('/help');
  await expect(page.getByRole('heading', { level: 1, name: 'Помочь' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Общий фонд/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Конкретному животному/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Приюту/ })).toBeVisible();
});

// В CI ключей ExpressPay нет — приём выключен, форма честно говорит «скоро»
test('general fund page without ExpressPay keys says donations are coming soon', async ({ page }) => {
  await page.goto('/help/general');
  await expect(page.getByRole('heading', { name: 'Помощь в общий фонд' })).toBeVisible();
  await expect(page.getByText(/Приём пожертвований скоро заработает/)).toBeVisible();
});

test('donate API is off without ExpressPay keys', async ({ request }) => {
  const r = await request.post('/api/donations/expresspay', { multipart: { amount: '25', targetType: 'general_fund' } });
  expect(r.status()).toBe(503);
});

test('animal donation page shows the animal; unknown slug is 404', async ({ page }) => {
  await page.goto('/animals?species=cat');
  const href = await page.getByText('Мурка №', { exact: false }).first().locator('xpath=ancestor-or-self::a').getAttribute('href');
  const slug = href!.split('/').pop()!;
  await page.goto(`/help/animal/${slug}`);
  await expect(page.getByText(/Помощь: Мурка №/)).toBeVisible();
  expect((await page.goto('/help/animal/no-such-animal'))!.status()).toBe(404);
});

test('thanks and failed pages render', async ({ page }) => {
  await page.goto('/help/thanks');
  await expect(page.getByRole('heading', { name: /Спасибо за помощь/ })).toBeVisible();
  await page.goto('/help/failed');
  await expect(page.getByRole('heading', { name: 'Платёж не завершён' })).toBeVisible();
});
