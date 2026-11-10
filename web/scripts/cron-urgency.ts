import { config as loadEnv } from 'dotenv';

// Триггер §17.6: дёргает защищённый роут пересчёта срочности (локально и из Railway cron-сервиса).
loadEnv({ path: '.env.local' });
loadEnv();

const base = (process.env.CRON_TARGET_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
const secret = process.env.CRON_SECRET;
if (!base || !secret) {
  console.error('[cron:urgency] нужны NEXT_PUBLIC_APP_URL (или CRON_TARGET_URL) и CRON_SECRET');
  process.exit(1);
}

const res = await fetch(`${base}/api/cron/urgency-recalc`, { method: 'POST', headers: { Authorization: `Bearer ${secret}` } });
console.log(`[cron:urgency] ${res.status} ${await res.text()}`);
process.exit(res.ok ? 0 : 1);
