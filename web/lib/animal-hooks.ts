import { slugifyRu } from './slug.ts';
import { computeDeadline, computeUrgency, URGENCY_RANK } from './urgency.ts';

const SPECIES_FALLBACK: Record<string, string> = { dog: 'dog', cat: 'cat', other: 'animal' };

export interface AnimalHookDeps {
  nextPetNumber: () => Promise<number>;
  getFacilityHoldDays: (facilityId: string) => Promise<number>;
  now: () => Date;
}

/**
 * beforeChange-хук Animal: petNumber + slug при создании, дедлайн + urgency всегда.
 * Чистая логика с инъекцией зависимостей — тестируется без БД.
 */
export function makeAnimalBeforeChangeHook(deps: AnimalHookDeps) {
  return async ({ data, operation, originalDoc }: any) => {
    if (!data) return data;

    // petNumber + slug — только при создании, стабильны на update
    if (operation === 'create') {
      data.petNumber = await deps.nextPetNumber();
      const label = data.name ? slugifyRu(data.name) : SPECIES_FALLBACK[data.species] ?? 'animal';
      data.slug = `${data.petNumber}-${label || 'pet'}`;
    } else {
      if (originalDoc?.petNumber != null) data.petNumber = originalDoc.petNumber;
      if (originalDoc?.slug && !data.slug) data.slug = originalDoc.slug;
    }

    // дедлайн: вручную заданный имеет приоритет, иначе считаем из facility
    let deadline: Date | null = null;
    if (data.legalDeadlineDate) {
      deadline = new Date(data.legalDeadlineDate);
    } else if (data.intakeFacility && data.intakeDate) {
      const facilityId = typeof data.intakeFacility === 'object' ? data.intakeFacility.id : data.intakeFacility;
      const holdDays = await deps.getFacilityHoldDays(String(facilityId));
      deadline = computeDeadline(new Date(data.intakeDate), holdDays);
      data.legalDeadlineDate = deadline.toISOString();
    }

    const level = computeUrgency(deadline, deps.now());
    data.urgencyLevel = level;
    data.urgencyRank = URGENCY_RANK[level];
    return data;
  };
}

/**
 * beforeValidate-хук Animal: проставляет publishedAt/adoptedAt при ЛЮБОЙ операции
 * (create | update), если статус соответствующий и метка ещё не задана.
 * Чистая логика с инъекцией `now` — тестируется без БД.
 * ВАЖНО: ставим без привязки к `operation === 'update'`, иначе seed и прямая
 * публикация org_admin (идут через create) оставляют publishedAt = null и
 * сортировки по `-publishedAt` ломаются.
 */
export function makeAnimalLifecycleStamps(now: () => Date = () => new Date()) {
  return ({ data }: any) => {
    if (!data) return data;
    if (data.status === 'published' && !data.publishedAt) {
      data.publishedAt = now().toISOString();
    }
    if (data.status === 'adopted' && !data.adoptedAt) {
      data.adoptedAt = now().toISOString();
    }
    return data;
  };
}
