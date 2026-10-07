export interface Crumb { label: string; href?: string }

/** Добавляет «Главная» в начало; у последнего элемента убирает href (текущая страница). */
export function buildBreadcrumbs(trail: Crumb[]): Crumb[] {
  const all: Crumb[] = [{ label: 'Главная', href: '/' }, ...trail];
  return all.map((c, i) => (i === all.length - 1 ? { label: c.label } : c));
}
