import { config as loadEnv } from 'dotenv';
import { getPayload } from 'payload';
import { sql } from 'drizzle-orm';
import { readFileSync, existsSync } from 'node:fs';

/**
 * Переносит значение из старого pet_counter.txt в pet_number_seq.
 * Запуск один раз нативным Node (НЕ tsx — см. docs/solutions/payload/standalone-script-node-not-tsx.md):
 *   node scripts/migrate-pet-counter.ts ../pet_counter.txt
 */
loadEnv({ path: '.env.local' }); // секреты Next-конвенции
loadEnv();                       // .env как fallback, не перезапишет заданное

async function main() {
  const path = process.argv[2] ?? '../pet_counter.txt';
  let start = 1;
  if (existsSync(path)) {
    const raw = readFileSync(path, 'utf-8').trim();
    const parsed = parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) start = parsed;
  }
  // динамически: payload.config читает process.env при вычислении — env уже загружен
  const { default: config } = await import('../payload.config.ts');
  const payload = await getPayload({ config });
  await (payload.db as any).drizzle.execute(
    sql`SELECT setval('pet_number_seq', ${start}, false)`,
  );
  console.log(`pet_number_seq set to start at ${start}`);
  process.exit(0);
}

main();
