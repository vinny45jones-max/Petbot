import { computeUrgency, URGENCY_RANK, type UrgencyLevel } from './urgency.ts';

export interface UrgencyInputRow {
  id: string;
  urgencyLevel: string | null;
  legalDeadlineDate: string | null;
  urgentAnnouncedAt?: string | null;
}

export interface UrgencyTransition {
  id: string;
  oldLevel: string;
  newLevel: UrgencyLevel;
  newRank: number;
  changed: boolean;
  becameCritical: boolean;
  becameHigh: boolean;
  /** critical и ещё не анонсирован (TG-канал + письма) — в т.ч. созданный сразу critical */
  needsAnnounce: boolean;
  /** вышел из critical (дедлайн продлили) — снять отметку, чтобы при новом critical анонсировать снова */
  clearAnnounce: boolean;
}

/** Чистый пересчёт уровня срочности (§17.4) и переходов (§17.6). now передаётся явно. */
export function computeUrgencyTransitions(rows: UrgencyInputRow[], now: Date): UrgencyTransition[] {
  return rows.map((r) => {
    const old = r.urgencyLevel ?? 'normal';
    const next = computeUrgency(r.legalDeadlineDate ? new Date(r.legalDeadlineDate) : null, now);
    const changed = next !== old;
    return {
      id: r.id,
      oldLevel: old,
      newLevel: next,
      newRank: URGENCY_RANK[next],
      changed,
      becameCritical: changed && next === 'critical',
      becameHigh: changed && next === 'high',
      needsAnnounce: next === 'critical' && !r.urgentAnnouncedAt,
      clearAnnounce: next !== 'critical' && !!r.urgentAnnouncedAt,
    };
  });
}
