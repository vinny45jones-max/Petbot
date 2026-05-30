function absolutize(base: string, url?: string | null): string | null {
  if (!url) return null;
  return url.startsWith('http') ? url : `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

const SPECIES_RU: Record<string, string> = { dog: 'Собака', cat: 'Кошка', other: 'Животное' };

export function buildAnimalJsonLd(a: any, base: string): Record<string, any> {
  const citySlug = a.city?.slug ?? 'by';
  const images = (Array.isArray(a.media) ? a.media : [])
    .map((m: any) => absolutize(base, typeof m === 'object' ? m.url : null))
    .filter(Boolean) as string[];
  const title = a.name ? `${a.name} №${a.petNumber}` : `№${a.petNumber}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${title} — ${SPECIES_RU[a.species] ?? 'Животное'} ищет дом`,
    url: `${base}/animals/${citySlug}/${a.species}/${a.slug}`,
    image: images,
    description: a.descriptionPlain ?? '',
    category: SPECIES_RU[a.species] ?? 'Животное',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'BYN', availability: 'https://schema.org/InStock' },
  };
}

export function buildOrganizationJsonLd(o: any, base: string): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: o.name,
    url: `${base}/organizations/${o.slug}`,
    ...(o.phone ? { telephone: o.phone } : {}),
    ...(o.city?.nameRu ? { address: { '@type': 'PostalAddress', addressLocality: o.city.nameRu, addressCountry: 'BY' } } : {}),
  };
}
