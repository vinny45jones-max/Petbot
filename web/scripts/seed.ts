import { config as loadEnv } from 'dotenv';
import { getPayload } from 'payload';
import { citiesBY } from '../lib/seeds/cities-by.ts';
import { intakeFacilitiesBY } from '../lib/seeds/intake-facilities-by.ts';
import { demoOrgs, demoAnimals } from '../lib/seeds/demo-catalog.ts';

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

async function backfillCitySlugs(payload: any) {
  const { docs } = await payload.find({ collection: 'cities', limit: 1000, depth: 0 });
  for (const city of docs) {
    if (!city.slug) {
      await payload.update({ collection: 'cities', id: city.id, data: { slug: slugify(city.nameRu) } });
    }
  }
}

async function findCityId(payload: any, nameRu: string): Promise<string | null> {
  const { docs } = await payload.find({ collection: 'cities', where: { nameRu: { equals: nameRu } }, limit: 1, depth: 0 });
  return docs[0]?.id ?? null;
}

async function seedFacilities(payload: any) {
  for (const f of intakeFacilitiesBY) {
    const exists = await payload.find({ collection: 'intakeFacilities', where: { name: { equals: f.name } }, limit: 1, depth: 0 });
    if (exists.docs.length) continue;
    await payload.create({ collection: 'intakeFacilities', data: {
      name: f.name, city: await findCityId(payload, f.cityName), address: f.address,
      phone: f.phone, legalHoldDays: f.legalHoldDays, isMunicipal: f.isMunicipal, isPublished: true,
    }});
  }
}

async function seedOrgs(payload: any) {
  for (const o of demoOrgs) {
    const exists = await payload.find({ collection: 'organizations', where: { name: { equals: o.name } }, limit: 1, depth: 0 });
    if (exists.docs.length) continue;
    await payload.create({ collection: 'organizations', data: {
      name: o.name, city: await findCityId(payload, o.cityName), isVerified: o.isVerified, isPublished: o.isPublished,
    }});
  }
}

async function seedAnimals(payload: any) {
  for (const a of demoAnimals) {
    const exists = await payload.find({ collection: 'animals', where: { name: { equals: a.name }, city: { equals: await findCityId(payload, a.cityName) } }, limit: 1, depth: 0 });
    if (a.name && exists.docs.length) continue;
    let orgId: string | null = null;
    if (a.orgName) {
      const org = await payload.find({ collection: 'organizations', where: { name: { equals: a.orgName } }, limit: 1, depth: 0 });
      orgId = org.docs[0]?.id ?? null;
    }
    let facilityId: string | null = null;
    let intakeDate: string | undefined;
    if (a.facilityName) {
      const fac = await payload.find({ collection: 'intakeFacilities', where: { name: { equals: a.facilityName } }, limit: 1, depth: 0 });
      facilityId = fac.docs[0]?.id ?? null;
      if (a.intakeOffsetDays != null) {
        intakeDate = new Date(Date.now() - a.intakeOffsetDays * 86400000).toISOString();
      }
    }
    await payload.create({ collection: 'animals', data: {
      name: a.name, species: a.species, sex: a.sex, ageYears: a.ageYears, size: a.size,
      city: await findCityId(payload, a.cityName), ownerType: a.ownerType, organization: orgId,
      intakeFacility: facilityId, intakeDate, status: a.status,
      description: { root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: a.descriptionText }] }] } },
    }});
  }
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

  await backfillCitySlugs(payload);
  await seedFacilities(payload);
  await seedOrgs(payload);
  await seedAnimals(payload);
  await seedTestUser(payload);
  await seedTestOrgAdmin(payload);
  console.log('Seeded facilities, orgs, animals.');
  process.exit(0);
}

async function seedTestUser(payload: any) {
  if (process.env.NODE_ENV === 'production') return;
  const email = 'citizen@test.local';
  const exists = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, overrideAccess: true });
  if (exists.docs.length) return;
  await payload.create({
    collection: 'users',
    data: { email, password: 'Test12345!', role: 'citizen', firstName: 'Тест', ageConfirmed: true, consentPersonalData: true, _verified: true } as any,
    overrideAccess: true,
  });
}

// org_admin + организация с детерминированным slug — для e2e проверки guard'а кабинета.
async function seedTestOrgAdmin(payload: any) {
  if (process.env.NODE_ENV === 'production') return;
  const email = 'orgadmin@test.local';
  let user = (await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, overrideAccess: true })).docs[0];
  if (!user) {
    user = await payload.create({
      collection: 'users',
      data: { email, password: 'Test12345!', role: 'org_admin', firstName: 'Орг', ageConfirmed: true, consentPersonalData: true, _verified: true } as any,
      overrideAccess: true,
    });
  }
  const existsOrg = await payload.find({ collection: 'organizations', where: { slug: { equals: 'test-shelter' } }, limit: 1, overrideAccess: true });
  if (!existsOrg.docs.length) {
    await payload.create({
      collection: 'organizations',
      data: { name: 'Тест-приют', slug: 'test-shelter', isVerified: true, isPublished: true, admins: [user.id] } as any,
      overrideAccess: true,
    });
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
