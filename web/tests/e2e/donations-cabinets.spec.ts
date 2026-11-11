import { test, expect } from '@playwright/test';

async function loginAs(page: any, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').first().fill(email);
  await page.getByLabel('Пароль').fill('Test12345!');
  await page.getByRole('button', { name: /Войти/ }).first().click();
  await expect(page).toHaveURL(/\/me|\/$/, { timeout: 15_000 });
}

test('me/donations redirects guests to login', async ({ page }) => {
  await page.goto('/me/donations');
  await expect(page).toHaveURL(/\/login/);
});

// seed: у citizen-donations@test.local оплаченный донат 25 BYN приюту test-shelter и неоплаченный 7 BYN
test('donor sees own donations with statuses', async ({ page }) => {
  await loginAs(page, 'citizen-donations@test.local');
  await page.goto('/me');
  await page.getByRole('link', { name: /Мои пожертвования/ }).click();
  await expect(page.getByRole('heading', { name: 'Мои пожертвования' })).toBeVisible();
  await expect(page.getByText('Оплачено')).toBeVisible();
  await expect(page.getByText('Ожидает оплаты')).toBeVisible();
  await expect(page.getByText('Тест-приют').first()).toBeVisible();
});

test('org admin sees paid donations total, without donor contacts', async ({ page }) => {
  await loginAs(page, 'orgadmin@test.local');
  await page.goto('/org/test-shelter');
  await page.getByRole('link', { name: 'Пожертвования' }).click();
  await expect(page.getByText(/Всего собрано:\s*25,00\sBYN/)).toBeVisible();
  await expect(page.getByText('citizen-donations@test.local')).toHaveCount(0);
});

// свой пользователь на тест: параллельные входы одного пользователя теряют сессии (И-18)
test('org donations page is closed to other users', async ({ page }) => {
  await loginAs(page, 'citizen@test.local');
  await page.goto('/org/test-shelter/donations');
  await expect(page).not.toHaveURL(/\/org\/test-shelter\/donations/);
});
