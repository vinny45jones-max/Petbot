import { test, expect } from '@playwright/test';

test('health endpoint returns ok with checks', async ({ request }) => {
  const r = await request.get('/api/health');
  expect(r.status()).toBe(200);
  const body = await r.json();
  expect(body.status).toBe('ok');
  expect(body.checks.db).toBe('ok');
  expect(['ok', 'off']).toContain(body.checks.storage);
  expect(JSON.stringify(body)).not.toMatch(/error|stack/i);
});

test('status page shows checks', async ({ page }) => {
  await page.goto('/status');
  await expect(page.getByTestId('overall-status')).toHaveText('Все системы работают.');
  await expect(page.getByText('База данных')).toBeVisible();
});
