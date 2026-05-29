import { test, expect } from '@playwright/test';

test('account deletion requires auth', async ({ request }) => {
  const r = await request.post('/api/account/delete');
  expect(r.status()).toBe(401);
});
