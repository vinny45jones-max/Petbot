import { getPayload } from 'payload';
import config from '@/payload.config';
import { parseAnimalFilters, buildAnimalWhere, sortForFilters, filtersToSearchParams, PAGE_SIZE } from '@/lib/filters';
import { searchAnimalIds } from '@/lib/search';
import { AnimalGrid } from '@/components/catalog/AnimalGrid';
import { Pagination } from '@/components/catalog/Pagination';
import { FilterPanel } from '@/components/catalog/FilterPanel';
import { SortSelect } from '@/components/catalog/SortSelect';
import type { Where } from 'payload';

export const dynamic = 'force-dynamic';

function toSearchParams(input: Record<string, string | string[] | undefined>): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(input)) {
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, x));
    else if (v != null) sp.append(k, v);
  }
  return sp;
}

export default async function AnimalsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = toSearchParams(await searchParams);
  const filters = parseAnimalFilters(sp);
  const payload = await getPayload({ config });

  // city: основной путь — резолв slug→id на сервере (dot-path city.slug фрагилен на разных версиях adapter).
  let where: Where = buildAnimalWhere({ ...filters, cities: [] });
  if (filters.cities.length) {
    const cityRes = await payload.find({ collection: 'cities', where: { slug: { in: filters.cities } }, limit: 200, depth: 0 });
    const cityIds = cityRes.docs.map((c: any) => c.id);
    where = { and: [where, { city: { in: cityIds.length ? cityIds : [-1] } }] };
  }
  if (filters.q) {
    const ids = await searchAnimalIds(payload, filters.q);
    where = { and: [where, { id: { in: ids.length ? ids : [-1] } }] };
  }

  const result = await payload.find({
    collection: 'animals',
    where,
    sort: sortForFilters(filters),
    limit: PAGE_SIZE,
    page: filters.page,
    depth: 1,
  });

  const makeHref = (p: number) => {
    const next = filtersToSearchParams({ ...filters, page: p });
    const qs = next.toString();
    return qs ? `/animals?${qs}` : '/animals';
  };

  const citiesRes = await payload.find({ collection: 'cities', limit: 200, sort: 'nameRu', depth: 0 });
  const cityOptions = citiesRes.docs.map((c: any) => ({ slug: c.slug ?? '', nameRu: c.nameRu })).filter((c: any) => c.slug);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Животные ищут дом</h1>
        <SortSelect />
      </div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
        <FilterPanel cities={cityOptions} />
        <div>
          <p className="mb-4 text-sm text-gray-500">{result.totalDocs} объявлений</p>
          <AnimalGrid animals={result.docs as any} />
          <Pagination page={result.page ?? 1} totalPages={result.totalPages ?? 1} makeHref={makeHref} />
        </div>
      </div>
    </main>
  );
}
