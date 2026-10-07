import { config as loadEnv } from 'dotenv';
import { getPayload } from 'payload';
import { citiesBY } from '../lib/seeds/cities-by.ts';
import { planCitySync } from '../lib/seeds/city-sync.ts';

// .env.local (Next-конвенция) грузим ДО payload.config, иначе DATABASE_URL/PAYLOAD_SECRET пустые.
loadEnv({ path: '.env.local' });
loadEnv(); // .env как fallback (не перезапишет уже заданное)

async function main() {
  // Динамический импорт: payload.config читает process.env при вычислении, env уже загружен выше.
  const { default: config } = await import('../payload.config.ts');
  const payload = await getPayload({ config });
  const { docs } = await payload.find({ collection: 'cities', limit: 1000, depth: 0, pagination: false });
  const plan = planCitySync(citiesBY, docs);
  for (const city of plan.create) {
    await payload.create({ collection: 'cities', data: city });
  }
  // Миграция slug'ов старой схемы транслитерации (ц→c, щ→sch, й→i, ё→e) на lib/slug slugifyRu.
  for (const u of plan.update) {
    await payload.update({ collection: 'cities', id: u.id, data: { slug: u.to } });
    console.log(`City slug: ${u.nameRu} ${u.from} → ${u.to}`);
  }
  console.log(`Cities: created ${plan.create.length}, slug migrated ${plan.update.length}, total in seed ${citiesBY.length}.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
