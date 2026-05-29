import { test, expect } from '@playwright/test';

test('export requires auth', async ({ request }) => {
  const r = await request.get('/api/account/export');
  expect(r.status()).toBe(401);
});
