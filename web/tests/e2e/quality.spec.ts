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

// seed: moderator-2fa@test.local (moderator, 2FA выключена)
test('2FA модератора: без неё нет админки и API; enroll → gate → /admin', async ({ page }) => {
  const { generate } = await import('otplib');
  await page.goto('/login');
  await page.getByLabel('Email').first().fill('moderator-2fa@test.local');
  await page.getByLabel('Пароль').fill('Test12345!');
  await page.getByRole('button', { name: /Войти/ }).first().click();
  await expect(page).toHaveURL(/\/me|\/$/, { timeout: 15_000 });

  await page.goto('/admin');
  await expect(page).toHaveURL(/\/2fa\?next=%2Fadmin/);
  expect((await page.request.get('/api/animals?limit=1')).status()).toBe(403);

  await page.getByLabel('Код подтверждения').fill('123456');
  await page.getByRole('button', { name: 'Подтвердить' }).click();
  await page.getByRole('main').getByRole('link', { name: 'Безопасность' }).click();

  await expect(page).toHaveURL(/\/me\/security/);
  await page.getByRole('button', { name: 'Настроить 2FA' }).click();
  const secret = (await page.getByTestId('totp-secret').textContent())!.trim();
  await page.getByLabel('Код из приложения').fill(await generate({ secret }));
  await page.getByRole('button', { name: 'Подтвердить' }).click();
  await expect(page.getByTestId('recovery-codes').locator('li')).toHaveCount(10);

  await page.goto('/admin');
  await expect(page).toHaveURL(/\/2fa/);
  await page.getByLabel('Код подтверждения').fill(await generate({ secret }));
  await page.getByRole('button', { name: 'Подтвердить' }).click();
  await expect(page).toHaveURL(/\/admin(\/)?$/, { timeout: 15_000 });
  await expect(page).not.toHaveURL(/unauthorized|login/);
  expect((await page.request.get('/api/animals?limit=1')).status()).toBe(200);
});
