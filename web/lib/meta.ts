import type { Metadata } from 'next';

function abs(base: string, url?: string | null): string | undefined {
  if (!url) return undefined;
  return url.startsWith('http') ? url : `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

const SPECIES_RU: Record<string, string> = { dog: 'Собака', cat: 'Кошка', other: 'Животное' };

export function buildAnimalMeta(a: any, base: string): Metadata {
  const citySlug = a.city?.slug ?? 'by';
  const cityName = a.city?.nameRu ?? '';
  const title = a.name ? `${a.name} №${a.petNumber}` : `№${a.petNumber}`;
  const fullTitle = `${title} — ${SPECIES_RU[a.species] ?? 'Животное'} ищет дом${cityName ? ` · ${cityName}` : ''}`;
  const desc = (a.descriptionPlain ?? '').slice(0, 160) || 'Помогите найти дом этому животному.';
  const url = `${base}/animals/${citySlug}/${a.species}/${a.slug}`;
  const firstImg = Array.isArray(a.media) && a.media[0] && typeof a.media[0] === 'object' ? abs(base, a.media[0].url) : undefined;
  return {
    title: fullTitle,
    description: desc,
    alternates: { canonical: url },
    openGraph: { title: fullTitle, description: desc, url, type: 'website', images: firstImg ? [{ url: firstImg }] : [] },
    twitter: { card: 'summary_large_image', title: fullTitle, description: desc, images: firstImg ? [firstImg] : [] },
  };
}

export function buildOrgMeta(o: any, base: string): Metadata {
  const url = `${base}/organizations/${o.slug}`;
  const desc = `Приют ${o.name}: животные ищут дом, как помочь.`;
  return {
    title: `${o.name} — приют`,
    description: desc,
    alternates: { canonical: url },
    openGraph: { title: o.name, description: desc, url, type: 'website' },
  };
}
