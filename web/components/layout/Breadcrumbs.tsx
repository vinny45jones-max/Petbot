import Link from 'next/link';
import { buildBreadcrumbs, type Crumb } from '@/lib/breadcrumbs';

export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  const crumbs = buildBreadcrumbs(trail);
  return (
    <nav aria-label="Хлебные крошки" className="mx-auto max-w-5xl px-4 py-3 text-sm text-gray-500">
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((c, i) => (
          <li key={i} className="flex items-center gap-1">
            {c.href ? <Link href={c.href} className="hover:underline">{c.label}</Link> : <span aria-current="page" className="text-gray-800">{c.label}</span>}
            {i < crumbs.length - 1 && <span aria-hidden>/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
