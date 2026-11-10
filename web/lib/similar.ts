export interface SimilarInput {
  id: string | number;
  species: string;
  city?: string | number | { id: string | number } | null;
}

/** Where для подбора похожих: тот же вид, тот же город (если есть), опубликованные, кроме самого животного. */
export function buildSimilarWhere(a: SimilarInput) {
  const and: Record<string, unknown>[] = [
    { status: { equals: 'published' } },
    { id: { not_equals: a.id } },
    { species: { equals: a.species } },
  ];
  if (a.city) {
    const cityId = typeof a.city === 'object' ? a.city.id : a.city;
    if (cityId) and.push({ city: { equals: cityId } });
  }
  return { and };
}
