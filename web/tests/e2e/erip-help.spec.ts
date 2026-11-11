import { test, expect } from '@playwright/test';

test('страница ЕРИП показывает номер заказа и инструкцию', async ({ page }) => {
  const res = await page.goto('/help/erip/don-100500');
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Оплата через ЕРИП' })).toBeVisible();
  await expect(page.getByTestId('erip-number')).toHaveText('don-100500');
  await expect(page.getByText(/Система .Расчёт/)).toBeVisible();
});

test('страница ЕРИП не показывает произвольный текст из ссылки', async ({ page }) => {
  const res = await page.goto('/help/erip/' + encodeURIComponent('Позвоните 80291234567'));
  expect(res?.status()).toBe(404);
});
