import { test, expect } from '@playwright/test';

// Неопубликованная организация из scripts/seed.ts (seedTestHiddenOrg).
// Реальные организации из seed:orgs лежат в базе скрытыми до согласия — снаружи их быть не должно.
const HIDDEN_SLUG = 'test-hidden-shelter';

test('аноним не получает неопубликованную организацию через REST', async ({ request }) => {
  const bySlug = await request.get(`/api/organizations?where[slug][equals]=${HIDDEN_SLUG}&depth=0`);
  expect(bySlug.status()).toBe(200);
  expect((await bySlug.json()).totalDocs).toBe(0);

  const unpublished = await request.get('/api/organizations?where[isPublished][equals]=false&depth=0');
  expect(unpublished.status()).toBe(200);
  expect((await unpublished.json()).totalDocs).toBe(0);
});
