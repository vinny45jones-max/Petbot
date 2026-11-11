export interface AnimalUrlInput {
  slug: string;
  species: string;
  city?: { slug?: string | null } | string | null;
}

export function animalUrl(a: AnimalUrlInput): string {
  const citySlug = a.city && typeof a.city === 'object' && a.city.slug ? a.city.slug : 'by';
  return `/animals/${citySlug}/${a.species}/${a.slug}`;
}

type CityRef = { slug?: string | null } | string | number | null | undefined;

// В хуках Payload city приходит id (depth 0) — для URL карточки нужен slug, догружаем.
export async function resolveAnimalCity(
  city: CityRef,
  findCity: (id: string | number) => Promise<{ slug?: string | null } | null>,
): Promise<{ slug?: string | null } | null> {
  if (!city) return null;
  if (typeof city === 'object') return city;
  return findCity(city).catch(() => null);
}
