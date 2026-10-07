import { test, expect } from '@playwright/test';

for (const [path, heading] of [
  ['/about', 'О проекте'],
  ['/faq', 'Частые вопросы'],
  ['/how-it-works', 'Как это работает'],
  ['/safety', 'Безопасность'],
  ['/help-center', 'Справочный центр'],
  ['/glossary', 'Глоссарий'],
] as const) {
  test(`page ${path} renders`, async ({ page }) => {
    await page.goto(path);
    // level 1: в футере есть h2 «О проекте» — без уровня тест проходил бы и на 404
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  });
}
