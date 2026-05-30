function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

export function formatAge(years?: number | null, months?: number | null): string {
  const y = years ?? 0;
  const m = months ?? 0;
  if (years == null && months == null) return '';
  if (y === 0 && m === 0) return 'меньше месяца';
  const parts: string[] = [];
  if (y > 0) parts.push(`${y} ${plural(y, ['год', 'года', 'лет'])}`);
  if (m > 0) parts.push(`${m} ${plural(m, ['месяц', 'месяца', 'месяцев'])}`);
  return parts.join(' ');
}

export function formatAnimalTitle(a: { name?: string | null; petNumber?: number | null }): string {
  const num = a.petNumber != null ? `№${a.petNumber}` : '';
  return a.name ? `${a.name} ${num}`.trim() : num;
}
