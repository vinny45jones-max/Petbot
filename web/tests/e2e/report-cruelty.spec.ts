import { test, expect } from '@playwright/test';

test('report-cruelty page shows info and form', async ({ page }) => {
  await page.goto('/report-cruelty');
  await expect(page.getByRole('heading', { name: 'Сообщить о жестоком обращении' })).toBeVisible();
  await expect(page.getByPlaceholder(/Опишите ситуацию/)).toBeVisible();
});

test('submitting a valid report succeeds (turnstile skipped in test env)', async ({ page }) => {
  await page.goto('/report-cruelty');
  await page.getByPlaceholder(/Опишите ситуацию/).fill('Во дворе на цепи держат собаку без воды и еды несколько дней.');
  await page.getByRole('button', { name: /Отправить сообщение/ }).click();
  // первый POST в next dev компилирует роут несколько секунд
  await expect(page.getByText(/Спасибо\. Сообщение получено/)).toBeVisible({ timeout: 15_000 });
});
