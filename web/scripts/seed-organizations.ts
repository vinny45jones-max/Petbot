import { config as loadEnv } from 'dotenv';
import { getPayload } from 'payload';
import { organizationsBY, intakeFacilityContactsBY } from '../lib/seeds/organizations-by.ts';

// Как scripts/seed.ts: env до payload.config, запуск нативным Node 24 (не tsx).
loadEnv({ path: '.env.local' });
loadEnv();

// Реальные организации из открытых источников: создаются неопубликованными и неверифицированными.
// Публикует модератор после согласия организации. Повторный запуск ничего не дублирует и не перезаписывает.

function richText(lines: string[]) {
  return {
    root: {
      type: 'root', format: '', indent: 0, version: 1, direction: 'ltr',
      children: lines.map((text) => ({ type: 'paragraph', version: 1, children: [{ type: 'text', text, version: 1 }] })),
    },
  };
}

async function findCityId(payload: any, nameRu?: string): Promise<string | null> {
  if (!nameRu) return null;
  const { docs } = await payload.find({ collection: 'cities', where: { nameRu: { equals: nameRu } }, limit: 1, depth: 0 });
  return docs[0]?.id ?? null;
}

async function main() {
  const { default: config } = await import('../payload.config.ts');
  const payload: any = await getPayload({ config });

  let created = 0;
  let skipped = 0;
  for (const o of organizationsBY) {
    const exists = await payload.find({ collection: 'organizations', where: { name: { equals: o.name } }, limit: 1, depth: 0, overrideAccess: true });
    if (exists.docs.length) { skipped++; continue; }
    const description = [o.kind, o.note, `Источник данных: ${o.source}. Контакты не подтверждены организацией.`].filter(Boolean) as string[];
    await payload.create({
      collection: 'organizations',
      overrideAccess: true,
      data: {
        name: o.name,
        city: await findCityId(payload, o.cityName),
        address: o.address, phone: o.phone, email: o.email,
        websiteUrl: o.websiteUrl, instagramUrl: o.instagramUrl, vkUrl: o.vkUrl, tgUrl: o.tgUrl, viberUrl: o.viberUrl,
        eripServiceCode: o.eripServiceCode, unp: o.unp,
        description: richText(description),
        isVerified: false,
        isPublished: false,
      },
    });
    created++;
  }
  console.log(`[seed:orgs] organizations: created ${created}, skipped ${skipped} existing.`);

  let filled = 0;
  for (const [name, c] of Object.entries(intakeFacilityContactsBY)) {
    const { docs } = await payload.find({ collection: 'intakeFacilities', where: { name: { equals: name } }, limit: 1, depth: 0, overrideAccess: true });
    const fac = docs[0];
    if (!fac) { console.log(`[seed:orgs] facility not found, skipped: ${name}`); continue; }
    const patch: Record<string, string> = {};
    if (!fac.address && c.address) patch.address = c.address;
    if (!fac.phone && c.phone) patch.phone = c.phone;
    if (!fac.viberUrl && c.viberUrl) patch.viberUrl = c.viberUrl;
    if (!fac.contactTgUrl && c.contactTgUrl) patch.contactTgUrl = c.contactTgUrl;
    if (!Object.keys(patch).length) continue;
    await payload.update({ collection: 'intakeFacilities', id: fac.id, overrideAccess: true, data: patch });
    filled++;
  }
  console.log(`[seed:orgs] intake facilities: filled blanks in ${filled}.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
