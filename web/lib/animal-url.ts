export interface AnimalUrlInput {
  slug: string;
  species: string;
  city?: { slug?: string | null } | string | null;
}

export function animalUrl(a: AnimalUrlInput): string {
  const citySlug = a.city && typeof a.city === 'object' && a.city.slug ? a.city.slug : 'by';
  return `/animals/${citySlug}/${a.species}/${a.slug}`;
}
