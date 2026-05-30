import type { Where } from 'payload';

export const PAGE_SIZE = 24;

export type Species = 'dog' | 'cat' | 'other';
export type Sex = 'male' | 'female' | 'unknown';
export type Size = 'small' | 'medium' | 'large';
export type OwnerType = 'citizen' | 'organization';
export type SortKey = 'urgent' | 'new' | 'longest';

export interface AnimalFilters {
  species?: Species;
  sex?: Sex;
  sizes: Size[];
  cities: string[];
  sterilized?: boolean;
  ownerType?: OwnerType;
  lostOrFound?: 'lost' | 'found';
  urgent: boolean;
  q?: string;
  page: number;
  sort: SortKey;
}

const SPECIES: Species[] = ['dog', 'cat', 'other'];
const SEX: Sex[] = ['male', 'female', 'unknown'];
const SIZES: Size[] = ['small', 'medium', 'large'];
const OWNER: OwnerType[] = ['citizen', 'organization'];
const SORTS: SortKey[] = ['urgent', 'new', 'longest'];

function pickEnum<T extends string>(value: string | null, allowed: T[]): T | undefined {
  return value && (allowed as string[]).includes(value) ? (value as T) : undefined;
}

export function parseAnimalFilters(sp: URLSearchParams): AnimalFilters {
  const pageRaw = parseInt(sp.get('page') ?? '1', 10);
  const lf = sp.get('lostOrFound');
  return {
    species: pickEnum(sp.get('species'), SPECIES),
    sex: pickEnum(sp.get('sex'), SEX),
    sizes: sp.getAll('size').filter((s): s is Size => (SIZES as string[]).includes(s)),
    cities: sp.getAll('city').filter(Boolean),
    sterilized: sp.get('sterilized') === '1' ? true : undefined,
    ownerType: pickEnum(sp.get('ownerType'), OWNER),
    lostOrFound: lf === 'lost' || lf === 'found' ? lf : undefined,
    urgent: sp.get('urgent') === '1',
    q: sp.get('q')?.trim() || undefined,
    page: Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1,
    sort: pickEnum(sp.get('sort'), SORTS) ?? 'urgent',
  };
}

export function buildAnimalWhere(f: AnimalFilters): Where {
  const and: Where[] = [{ status: { equals: 'published' } }];
  if (f.species) and.push({ species: { equals: f.species } });
  if (f.sex) and.push({ sex: { equals: f.sex } });
  if (f.sizes.length) and.push({ size: { in: f.sizes } });
  if (f.cities.length) and.push({ 'city.slug': { in: f.cities } });
  if (f.sterilized) and.push({ isSterilized: { equals: true } });
  if (f.ownerType) and.push({ ownerType: { equals: f.ownerType } });
  if (f.lostOrFound) and.push({ lostOrFound: { equals: f.lostOrFound } });
  if (f.urgent) and.push({ urgencyLevel: { in: ['critical', 'high'] } });
  return { and };
}

export function sortForFilters(f: AnimalFilters): string[] {
  if (f.sort === 'new') return ['-publishedAt'];
  if (f.sort === 'longest') return ['publishedAt'];
  return ['-urgencyRank', '-publishedAt'];
}

export function filtersToSearchParams(f: AnimalFilters): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.species) sp.set('species', f.species);
  if (f.sex) sp.set('sex', f.sex);
  f.sizes.forEach((s) => sp.append('size', s));
  f.cities.forEach((c) => sp.append('city', c));
  if (f.sterilized) sp.set('sterilized', '1');
  if (f.ownerType) sp.set('ownerType', f.ownerType);
  if (f.lostOrFound) sp.set('lostOrFound', f.lostOrFound);
  if (f.urgent) sp.set('urgent', '1');
  if (f.q) sp.set('q', f.q);
  if (f.page > 1) sp.set('page', String(f.page));
  if (f.sort !== 'urgent') sp.set('sort', f.sort);
  return sp;
}
