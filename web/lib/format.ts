// Форматтеры и plural-правила для локали ru-BY. formatByn — канон в lib/payments/amounts.ts.
export { formatByn } from '@/lib/payments/amounts';

/** CLDR-правило множественного числа для русского. */
export function pluralRu(count: number, forms: { one: string; few: string; many: string }): string {
  const n = Math.abs(count);
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms.one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms.few;
  return forms.many;
}

const plural = (n: number, [one, few, many]: [string, string, string]) => pluralRu(n, { one, few, many });

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ru-BY').format(value);
}

export function formatDate(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('ru-BY', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
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
