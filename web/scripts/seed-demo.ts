import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { getPayload } from 'payload';
import { intakeFacilitiesBY } from '../lib/seeds/intake-facilities-by.ts';
import { showcaseOrgs, showcaseAnimals, DEMO_EMAIL_DOMAIN } from '../lib/seeds/demo-showcase.ts';

// Демо-витрина: приюты и животные с фото. Идемпотентно; повторный запуск освежает сроки служб отлова.
//   npm run seed:demo             — залить / обновить
//   npm run seed:demo -- --remove — удалить всё демо
// На прод-БД запускать только с NODE_ENV=production (иначе Payload сделает push схемы).
loadEnv({ path: '.env.local' });
loadEnv();

const DAY = 86400000;
const ASSETS = path.resolve(import.meta.dirname, '../seed-assets/demo');
const rich = (paragraphs: string[]) => ({ root: { type: 'root', format: '', indent: 0, version: 1, direction: 'ltr', children:
  paragraphs.map((text) => ({ type: 'paragraph', version: 1, children: [{ type: 'text', text, version: 1 }] })) } }) as any;

async function one(payload: any, collection: string, where: Record<string, unknown>) {
  const r = await payload.find({ collection, where, limit: 1, depth: 0 });
  return r.docs[0] ?? null;
}

async function ensureMedia(payload: any, photo: string, alt: string): Promise<number> {
  const filename = `demo-${photo}.jpg`;
  const found = await one(payload, 'media', { filename: { equals: filename } });
  if (found) return found.id;
  const doc = await payload.create({ collection: 'media', data: { alt, mediaKind: 'image' }, filePath: path.join(ASSETS, filename) });
  if (doc.filename !== filename) throw new Error(`media/${filename} уже есть на диске без записи в БД (получилось ${doc.filename}) — удали web/media/demo-* и повтори`);
  return doc.id;
}

async function remove(payload: any) {
  const orgs = await payload.find({ collection: 'organizations', where: { email: { like: `@${DEMO_EMAIL_DOMAIN}` } }, limit: 100, depth: 0 });
  const orgIds = orgs.docs.map((o: any) => o.id);
  if (orgIds.length) {
    const a = await payload.delete({ collection: 'animals', where: { organization: { in: orgIds } } });
    console.log(`[demo] удалено животных: ${a.docs.length}`);
    await payload.delete({ collection: 'organizations', where: { id: { in: orgIds } } });
    console.log(`[demo] удалено организаций: ${orgIds.length}`);
  }
  const m = await payload.delete({ collection: 'media', where: { filename: { like: 'demo-' } } });
  console.log(`[demo] удалено фото: ${m.docs.length}`);
}

async function main() {
  const { default: config } = await import('../payload.config.ts');
  const payload = await getPayload({ config });

  if (process.argv.includes('--remove')) { await remove(payload); process.exit(0); }

  const cityId = async (nameRu: string) => {
    const c = await one(payload, 'cities', { nameRu: { equals: nameRu } });
    if (!c) throw new Error(`нет города ${nameRu} — сначала npm run seed`);
    return c.id;
  };

  for (const f of intakeFacilitiesBY) {
    if (await one(payload, 'intakeFacilities', { name: { equals: f.name } })) continue;
    await payload.create({ collection: 'intakeFacilities', data: {
      name: f.name, city: await cityId(f.cityName), address: f.address, phone: f.phone,
      legalHoldDays: f.legalHoldDays, isMunicipal: f.isMunicipal, isPublished: true,
    } });
    console.log(`[demo] служба отлова: ${f.name}`);
  }

  const orgIds = new Map<string, number>();
  for (const o of showcaseOrgs) {
    const data = {
      name: o.name, city: await cityId(o.cityName), address: o.address, phone: o.phone,
      email: `${o.key}@${DEMO_EMAIL_DOMAIN}`, description: rich(o.about),
      coverPhoto: await ensureMedia(payload, o.cover, o.name), isVerified: true, isPublished: true,
    };
    const found = await one(payload, 'organizations', { email: { equals: data.email } });
    const doc = found
      ? await payload.update({ collection: 'organizations', id: found.id, data })
      : await payload.create({ collection: 'organizations', data });
    orgIds.set(o.key, doc.id);
    if (!found) console.log(`[demo] организация: ${o.name}`);
  }

  let created = 0, updated = 0;
  for (const a of showcaseAnimals) {
    const title = a.name ?? (a.species === 'cat' ? 'Кот' : 'Собака');
    const mediaId = await ensureMedia(payload, a.photo, `${title} — ${a.species === 'cat' ? 'кошка' : 'собака'}, ${a.cityName}`);
    const facility = a.facilityName ? await one(payload, 'intakeFacilities', { name: { equals: a.facilityName } }) : null;
    const data: any = {
      name: a.name, species: a.species, sex: a.sex, ageYears: a.ageYears ?? 0, ageMonths: a.ageMonths ?? 0, size: a.size,
      city: await cityId(a.cityName), ownerType: 'organization', organization: orgIds.get(a.org),
      description: rich(a.about), media: [mediaId],
      healthStatus: a.healthStatus ?? 'healthy', isSterilized: !!a.isSterilized, isVaccinated: !!a.isVaccinated,
      specialStatus: a.specialStatus ?? [], lostOrFound: a.lostOrFound ?? 'none',
      status: 'published', source: 'admin',
      publishedAt: new Date(Date.now() - a.publishedDaysAgo * DAY - 3600000).toISOString(),
      // сроки считаются от дня запуска: дедлайн сбрасываем, хук пересчитает его из intakeDate
      intakeFacility: facility?.id ?? null,
      intakeDate: facility && a.intakeOffsetDays != null ? new Date(Date.now() - a.intakeOffsetDays * DAY).toISOString() : null,
      legalDeadlineDate: null,
    };
    const found = await one(payload, 'animals', { media: { in: [mediaId] } });
    if (found) { await payload.update({ collection: 'animals', id: found.id, data }); updated++; }
    else { await payload.create({ collection: 'animals', data }); created++; }
  }
  console.log(`[demo] животные: создано ${created}, обновлено ${updated}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
