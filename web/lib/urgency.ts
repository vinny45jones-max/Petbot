export type UrgencyLevel = 'normal' | 'high' | 'critical';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computeDeadline(intakeDate: Date, holdDays: number): Date {
  return new Date(intakeDate.getTime() + holdDays * MS_PER_DAY);
}

/** Полных дней до дедлайна от now, с округлением вверх. Отрицательно если просрочено. */
export function daysUntil(deadline: Date, now: Date): number {
  // || 0 нормализует -0 (Math.ceil от малой отрицательной дроби) к +0 — иначе toBe(0) падает на Object.is.
  return Math.ceil((deadline.getTime() - now.getTime()) / MS_PER_DAY) || 0;
}

export function computeUrgency(deadline: Date | null, now: Date): UrgencyLevel {
  if (!deadline) return 'normal';
  const days = daysUntil(deadline, now);
  if (days <= 3) return 'critical';
  if (days <= 7) return 'high';
  return 'normal';
}

/** Числовой ранг для сортировки каталога: critical сверху. */
export const URGENCY_RANK: Record<UrgencyLevel, number> = { normal: 0, high: 1, critical: 2 };
