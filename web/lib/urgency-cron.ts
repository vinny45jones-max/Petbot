import { computeUrgencyTransitions } from './urgency-recalc.ts';
import { daysUntil } from './urgency.ts';
import { animalUrl } from './animal-url.ts';
import { urgentAnimalMessage } from './notify/messages.ts';

export interface CronAnimal {
  id: string;
  name?: string | null;
  petNumber: number;
  species: string;
  slug: string;
  urgencyLevel: string | null;
  legalDeadlineDate: string | null;
  urgentAnnouncedAt?: string | null;
  city?: { id: string | number; slug?: string | null; nameRu?: string | null } | null;
  facilityName?: string | null;
  photoUrl?: string | null;
}

export interface CronPref {
  id: string;
  email: string;
  cityIds: string[];
  urgentLastSentAt?: string | null;
}

export interface UrgentAlertItem {
  title: string;
  url: string;
  daysLeft: number | null;
}

export interface UrgencyCronDeps {
  now: Date;
  baseUrl: string;
  findAnimals: () => Promise<CronAnimal[]>;
  updateAnimal: (id: string, data: Record<string, unknown>) => Promise<void>;
  findPrefs: () => Promise<CronPref[]>;
  markPrefSent: (id: string) => Promise<void>;
  postToChannel: (text: string, photoUrl?: string) => Promise<void>;
  sendAlert: (to: string, city: string, items: UrgentAlertItem[]) => Promise<void>;
}

export interface UrgencyCronResult {
  changed: number;
  announced: number;
  emailed: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const absolute = (baseUrl: string, url: string) => (/^https?:\/\//.test(url) ? url : `${baseUrl}${url}`);

/** Оркестрация §17.6: пересчёт срочности, автопост новых critical в канал, письма подписчикам города. */
export async function runUrgencyRecalc(deps: UrgencyCronDeps): Promise<UrgencyCronResult> {
  const { now, baseUrl } = deps;
  const animals = await deps.findAnimals();
  const byId = new Map(animals.map((a) => [a.id, a]));
  const transitions = computeUrgencyTransitions(animals, now);

  const item = (a: CronAnimal): UrgentAlertItem => ({
    title: a.name ? `${a.name} №${a.petNumber}` : `№${a.petNumber}`,
    url: absolute(baseUrl, animalUrl(a)),
    daysLeft: a.legalDeadlineDate ? daysUntil(new Date(a.legalDeadlineDate), now) : null,
  });

  let changed = 0;
  const announced: CronAnimal[] = [];

  for (const t of transitions) {
    const data: Record<string, unknown> = {};
    if (t.changed) {
      data.urgencyLevel = t.newLevel;
      data.urgencyRank = t.newRank;
      changed++;
    }
    if (t.clearAnnounce) data.urgentAnnouncedAt = null;
    if (Object.keys(data).length) await deps.updateAnimal(t.id, data);

    if (t.needsAnnounce) {
      const a = byId.get(t.id)!;
      const i = item(a);
      try {
        await deps.postToChannel(
          urgentAnimalMessage({ title: i.title, city: a.city?.nameRu ?? null, daysLeft: i.daysLeft, url: i.url, facility: a.facilityName ?? null }),
          a.photoUrl ? absolute(baseUrl, a.photoUrl) : undefined,
        );
      } catch (e) {
        console.error('[urgency] channel post failed', t.id, e);
      }
      // отметка ставится и при сбое канала: письма ниже всё равно уйдут, а повторять анонс ежедневно нельзя
      await deps.updateAnimal(t.id, { urgentAnnouncedAt: now.toISOString() });
      announced.push(a);
    }
  }

  let emailed = 0;
  if (announced.length) {
    for (const pref of await deps.findPrefs()) {
      const last = pref.urgentLastSentAt ? new Date(pref.urgentLastSentAt).getTime() : 0;
      if (now.getTime() - last < DAY_MS) continue;
      const matched = announced.filter((a) => a.city && pref.cityIds.includes(String(a.city.id)));
      if (!matched.length) continue;
      try {
        await deps.sendAlert(pref.email, matched[0].city?.nameRu ?? 'вашем городе', matched.map(item));
        await deps.markPrefSent(pref.id);
        emailed++;
      } catch (e) {
        console.error('[urgency] alert email failed', pref.id, e);
      }
    }
  }

  return { changed, announced: announced.length, emailed };
}
