import { test, expect } from '@playwright/test';

test('animal card links through to detail page', async ({ page }) => {
  await page.goto('/animals?species=dog');
  await page.getByText('Рекс №', { exact: false }).first().click();
  await expect(page).toHaveURL(/\/animals\/minsk\/dog\/\d+-reks/);
  await expect(page.getByRole('heading', { name: /Рекс №\d+/ })).toBeVisible();
});

test('intake-facility animal shows call block', async ({ page }) => {
  await page.goto('/animals?urgent=1');
  await page.getByText(/Осталось \d+ дн\./).first().click();
  await expect(page.getByText('В службе отлова')).toBeVisible();
});

test('unknown slug returns 404', async ({ page }) => {
  const res = await page.goto('/animals/minsk/dog/999999-nope');
  expect(res?.status()).toBe(404);
});
