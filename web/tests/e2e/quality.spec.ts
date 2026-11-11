import { test, expect } from '@playwright/test';

test('«Шрифт крупнее»: цикл масштаба, сохранение после перезагрузки', async ({ page }) => {
  await page.goto('/about');
  const html = page.locator('html');
  const toggle = page.getByTestId('font-size-toggle');
  await expect(toggle).toHaveText(/Шрифт крупнее/);
  await toggle.click();
  await expect(html).toHaveAttribute('data-font-scale', 'large');
  await page.reload();
  await expect(html).toHaveAttribute('data-font-scale', 'large');
  await page.getByTestId('font-size-toggle').click();
  await expect(html).toHaveAttribute('data-font-scale', 'xlarge');
  await page.getByTestId('font-size-toggle').click();
  await expect(html).not.toHaveAttribute('data-font-scale', /.+/);
});

test('onboarding: после согласия на cookie, 3 шага, больше не показывается', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: 'Знакомство с сайтом' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Принять' }).click();
  const tour = page.getByRole('dialog', { name: 'Знакомство с сайтом' });
  await expect(tour).toContainText('Шаг 1 из 3');
  await tour.getByRole('button', { name: 'Далее' }).click();
  await tour.getByRole('button', { name: 'Далее' }).click();
  await tour.getByRole('button', { name: 'Понятно' }).click();
  await expect(tour).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading').first()).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Знакомство с сайтом' })).toHaveCount(0);
});
