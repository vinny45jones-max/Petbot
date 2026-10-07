export type BadgeTone = 'critical' | 'warning' | 'info' | 'success' | 'neutral';
export interface Badge { label: string; tone: BadgeTone }

export interface AnimalBadgeInput {
  status?: string | null;
  urgencyLevel?: string | null;
  ownerType?: string | null;
  lostOrFound?: string | null;
  healthStatus?: string | null;
  specialStatus?: string[] | null;
}

/** Чистый расчёт списка бейджей для карточки/детальной. Порядок = приоритет вывода. */
export function computeAnimalBadges(a: AnimalBadgeInput): Badge[] {
  if (a.status === 'adopted') return [{ label: 'Пристроен', tone: 'success' }];

  const badges: Badge[] = [];

  if (a.urgencyLevel === 'critical') badges.push({ label: 'СРОЧНО', tone: 'critical' });
  else if (a.urgencyLevel === 'high') badges.push({ label: 'Срочно', tone: 'warning' });

  if (a.lostOrFound === 'lost') badges.push({ label: 'Потерян', tone: 'warning' });
  else if (a.lostOrFound === 'found') badges.push({ label: 'Найден', tone: 'info' });

  const special = a.specialStatus ?? [];
  if (special.includes('reserved')) badges.push({ label: 'Забронирован', tone: 'info' });
  if (special.includes('needs_temp_home')) badges.push({ label: 'Нужна передержка', tone: 'warning' });
  if (special.includes('quarantine')) badges.push({ label: 'На карантине', tone: 'neutral' });

  if (a.healthStatus === 'needs_treatment') badges.push({ label: 'Нужно лечение', tone: 'warning' });

  if (a.ownerType === 'organization') badges.push({ label: 'Приют', tone: 'neutral' });

  return badges;
}
