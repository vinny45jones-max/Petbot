import { test, expect } from '@playwright/test';

test('partner application submits', async ({ page }) => {
  await page.goto('/contacts');
  await expect(page.getByRole('heading', { level: 1, name: 'Контакты' })).toBeVisible();
  await page.getByPlaceholder('Название организации').fill('Приют «Лапа»');
  await page.getByPlaceholder('УНП (9 цифр)').fill('123456789');
  await page.getByPlaceholder(/Контакт:/).fill('+375291112233');
  await page.getByRole('button', { name: 'Подключить приют' }).click();
  // первый POST в next dev компилирует роут несколько секунд
  await expect(page.getByText(/Заявка отправлена/)).toBeVisible({ timeout: 15_000 });
});
