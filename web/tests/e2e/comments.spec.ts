import { test, expect } from '@playwright/test';

async function loginAs(page: any, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill('Test12345!');
  await page.getByRole('button', { name: /Войти/ }).click();
  await expect(page).toHaveURL(/\/me|\/$/, { timeout: 15_000 });
}

// Блог в CI не засеян — комментарии проверяем на карточке животного из seed Plan 2.
async function openMurka(page: any) {
  await page.goto('/animals?species=cat');
  await page.getByText('Мурка №', { exact: false }).first().click();
  await expect(page.getByRole('heading', { name: 'Комментарии' })).toBeVisible({ timeout: 15_000 });
}

test('comment API requires auth', async ({ request }) => {
  const r = await request.post('/api/public/comments', { multipart: { body: 'hi', targetType: 'animal', targetId: '1' } });
  expect(r.status()).toBe(401);
});

test('guest sees login prompt under comments', async ({ page }) => {
  await openMurka(page);
  await expect(page.getByText(/Чтобы оставить комментарий/)).toBeVisible();
});

test('citizen posts a comment and can report it', async ({ page }) => {
  await loginAs(page, 'citizen@test.local');
  await openMurka(page);
  const text = `Хочу помочь Мурке! ${Date.now()}`;
  await page.getByPlaceholder('Ваш комментарий').fill(text);
  await page.getByRole('button', { name: 'Отправить' }).click();
  const item = page.getByRole('listitem').filter({ hasText: text });
  await expect(item).toBeVisible({ timeout: 15_000 });

  await item.getByRole('button', { name: 'Пожаловаться' }).click();
  await item.getByPlaceholder('Причина жалобы').fill('Проверка жалобы');
  await item.getByRole('button', { name: 'Отправить жалобу' }).click();
  await expect(item.getByText('Жалоба отправлена')).toBeVisible({ timeout: 15_000 });
});
