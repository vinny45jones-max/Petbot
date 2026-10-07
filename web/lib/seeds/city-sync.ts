import { slugifyRu } from '../slug.ts';
import type { CitySeed } from './cities-by.ts';

export function citySlug(nameRu: string): string {
  return slugifyRu(nameRu);
}

export interface ExistingCity {
  id: number | string;
  nameRu: string;
  slug: string;
}

export interface CitySyncPlan {
  create: (CitySeed & { slug: string })[];
  update: { id: ExistingCity['id']; nameRu: string; from: string; to: string }[];
}

/**
 * Сводит seed городов с БД. Сопоставление по nameRu (уникален в seed), а не по slug:
 * так seed находит города со slug'ами старой схемы транслитерации и переводит их на citySlug,
 * вместо того чтобы создать дубли. Города вне seed не трогаются.
 */
export function planCitySync(seed: CitySeed[], existing: ExistingCity[]): CitySyncPlan {
  const byName = new Map(existing.map((c) => [c.nameRu, c]));
  const plan: CitySyncPlan = { create: [], update: [] };
  for (const city of seed) {
    const slug = citySlug(city.nameRu);
    const found = byName.get(city.nameRu);
    if (!found) plan.create.push({ ...city, slug });
    else if (found.slug !== slug) plan.update.push({ id: found.id, nameRu: city.nameRu, from: found.slug, to: slug });
  }
  return plan;
}
