import crypto from 'node:crypto';
import { test, expect } from '@playwright/test';
import pg from 'pg';

// И-25: вход через Telegram и magic-link должен давать сессию, которую принимает Payload (а не только cookie).

function signTelegram(data: Record<string, string | number>, botToken: string): string {
  const check = Object.keys(data).sort().map((k) => `${k}=${data[k]}`).join('\n');
  const secret = crypto.createHash('sha256').update(botToken).digest();
  return crypto.createHmac('sha256', secret).update(check).digest('hex');
}

async function expectLoggedIn(page: import('@playwright/test').Page) {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Главная навигация' });
  await expect(nav.getByRole('link', { name: 'Кабинет' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Войти' })).toHaveCount(0);
  const me = await page.request.get('/api/users/me');
  expect((await me.json()).user, 'Payload видит пользователя').toBeTruthy();
}

test('вход через Telegram создаёт рабочую сессию', async ({ page }) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  test.skip(!botToken, 'нужен TELEGRAM_BOT_TOKEN (задаётся в ci:local и CI)');
  const data = { id: 700000000 + Math.floor(Math.random() * 1e8), first_name: 'Телеграм', auth_date: Math.floor(Date.now() / 1000) };
  const r = await page.request.post('/api/auth/telegram/verify', { data: { ...data, hash: signTelegram(data, botToken!) } });
  expect(r.status()).toBe(200);
  await expectLoggedIn(page);
});

test('вход по magic-link создаёт рабочую сессию', async ({ page }) => {
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const raw = crypto.randomBytes(32).toString('hex');
  try {
    const user = await db.query("SELECT id FROM users WHERE email = 'citizen-magic@test.local'");
    expect(user.rows.length, 'сид создаёт citizen-magic@test.local').toBe(1);
    await db.query('INSERT INTO magic_link_tokens (token_hash, user_id) VALUES ($1, $2)', [
      crypto.createHash('sha256').update(raw).digest('hex'),
      user.rows[0].id,
    ]);
  } finally {
    await db.end();
  }
  // GET ссылки токен не тратит: её повторяют Chrome (Critical-CH) и почтовые сканеры
  expect((await page.request.get(`/login/magic?token=${raw}`)).status()).toBe(200);
  await page.goto(`/login/magic?token=${raw}`);
  await expect(page).toHaveURL(/\/me$/);
  await expectLoggedIn(page);
});
