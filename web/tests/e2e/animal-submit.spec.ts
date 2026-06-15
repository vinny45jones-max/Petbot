import { test, expect } from '@playwright/test';

async function loginAs(page: any, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill('Test12345!');
  await page.getByRole('button', { name: /Войти/ }).click();
  await expect(page).toHaveURL(/\/me|\/$/);
}

test('citizen submits an animal via wizard', async ({ page }) => {
  await loginAs(page, 'citizen@test.local');
  await page.goto('/me/animals/new');

  // шаг 1 — фото
  await page.setInputFiles('input[type="file"]', 'tests/fixtures/dog.jpg');
  await expect(page.locator('img[alt=""]').first()).toBeVisible();
  await page.getByRole('button', { name: 'Далее' }).click();

  // шаг 2 — вид/город
  await page.getByLabel('Собака').check();
  await page.getByRole('button', { name: 'Далее' }).click();

  // шаг 3 — описание/контакт
  await page.getByLabel('Описание *').fill('Дружелюбный пёс ищет дом, ладит с детьми.');
  await page.locator('select').filter({ hasText: 'Выберите город' }).selectOption({ label: 'Минск' });
  await page.getByPlaceholder('+375XXXXXXXXX').fill('+375291112233');
  await page.getByRole('button', { name: 'Далее' }).click();

  // шаг 4 — отправка
  await page.getByRole('button', { name: 'Отправить на проверку' }).click();
  await expect(page).toHaveURL(/\/me\/animals/);

  // объявление видно в статусе «На проверке»
  await expect(page.getByText('На проверке').first()).toBeVisible();
});

test('org_admin opens org cabinet (req.user.organizations populated, no redirect)', async ({ page }) => {
  await loginAs(page, 'orgadmin@test.local');
  const res = await page.goto('/org/test-shelter');
  expect(res?.status()).toBe(200);
  // requireOrgAdmin не редиректнул на '/'
  await expect(page).toHaveURL(/\/org\/test-shelter\/?$/);
  await expect(page.getByRole('heading', { name: 'Тест-приют' })).toBeVisible();
});
