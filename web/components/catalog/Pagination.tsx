import Link from 'next/link';

export function Pagination({ page, totalPages, makeHref }: { page: number; totalPages: number; makeHref: (p: number) => string }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Постраничная навигация">
      {page > 1 && <Link href={makeHref(page - 1)} className="rounded-lg border px-4 py-2 hover:bg-gray-50">Назад</Link>}
      <span className="px-4 py-2 text-sm text-gray-600">Страница {page} из {totalPages}</span>
      {page < totalPages && <Link href={makeHref(page + 1)} className="rounded-lg border px-4 py-2 hover:bg-gray-50">Вперёд</Link>}
    </nav>
  );
}
