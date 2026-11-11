// Railway Function по расписанию (И-22): POST на защищённый cron-роут сайта. Путь — CRON_PATH, общий для всех cron-функций.
const base = (process.env.APP_URL ?? '').replace(/\/$/, '');
const path = process.env.CRON_PATH ?? '';
const secret = process.env.CRON_SECRET ?? '';
if (!base || !path || !secret) {
  console.error('[cron] нужны APP_URL, CRON_PATH и CRON_SECRET');
  process.exit(1);
}
const res = await fetch(`${base}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${secret}` } });
console.log(`[cron] ${path} ${res.status} ${(await res.text()).slice(0, 500)}`);
process.exit(res.ok ? 0 : 1);
