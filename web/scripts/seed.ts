import { config as loadEnv } from 'dotenv';
import { getPayload } from 'payload';
import { citiesBY } from '../lib/seeds/cities-by.ts';

// .env.local (Next-конвенция) грузим ДО payload.config, иначе DATABASE_URL/PAYLOAD_SECRET пустые.
loadEnv({ path: '.env.local' });
loadEnv(); // .env как fallback (не перезапишет уже заданное)

const RU_LAT: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'i',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
};
// Идентичен lib/slug.ts (Plan 2 slugifyRu) — slug города в seed и в рантайме должны совпадать.
function slugify(s: string): string {
  return s.toLowerCase().split('').map((ch) => RU_LAT[ch] ?? ch).join('')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function main() {
  // Динамический импорт: payload.config читает process.env при вычислении, env уже загружен выше.
  const { default: config } = await import('../payload.config.ts');
  const payload = await getPayload({ config });
  let created = 0;
  let skipped = 0;
  for (const city of citiesBY) {
    const slug = slugify(city.nameRu);
    const existing = await payload.find({ collection: 'cities', where: { slug: { equals: slug } }, limit: 1 });
    if (existing.docs.length) { skipped++; continue; }
    await payload.create({ collection: 'cities', data: { ...city, slug } });
    created++;
  }
  console.log(`Seeded ${created} cities, skipped ${skipped} existing.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
