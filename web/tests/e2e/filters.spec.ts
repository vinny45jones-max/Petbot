import { test, expect } from '@playwright/test';

test('selecting species radio updates URL and grid', async ({ page }) => {
  await page.goto('/animals');
  await page.getByLabel('Кошки').check();
  await expect(page).toHaveURL(/species=cat/);
  await expect(page.getByText('Мурка №', { exact: false })).toBeVisible();
});

test('urgent checkbox filters to urgent animals', async ({ page }) => {
  await page.goto('/animals');
  await page.getByLabel('Только срочные').check();
  await expect(page).toHaveURL(/urgent=1/);
  await expect(page.getByText(/Осталось \d+ дн\./).first()).toBeVisible();
});

test('sort select switches to newest', async ({ page }) => {
  await page.goto('/animals');
  await page.getByLabel('Сортировка:').selectOption('new');
  await expect(page).toHaveURL(/sort=new/);
});

// ФИКС: явно покрываем фильтр по городу (риск dot-path по relationship в Postgres-adapter).
// Seed: Рекс — Минск (dog), Барсик — Гомель (cat). Выбираем Минск:
// в выдаче есть минское животное и НЕТ гомельского.
test('selecting Минск shows only Minsk animals', async ({ page }) => {
  await page.goto('/animals');
  await page.getByRole('group', { name: 'Город' }).getByLabel('Минск').check();
  await expect(page).toHaveURL(/city=minsk/);
  await expect(page.getByText('Рекс №', { exact: false })).toBeVisible();
  await expect(page.getByText('Барсик №', { exact: false })).toHaveCount(0);
});
