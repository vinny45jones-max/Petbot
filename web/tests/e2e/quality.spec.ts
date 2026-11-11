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
