import Link from 'next/link';

// Рендерится внутри (public)/layout.tsx (html/body/Header/Footer уже есть),
// поэтому это только контент. Срабатывает на notFound() в (public)-маршрутах
// и на catch-all [...not-found] для несопоставленных URL.
export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="text-sm font-semibold text-gray-600">Ошибка 404</p>
      <h1 className="mt-2 text-4xl font-bold">Страница не найдена</h1>
      <p className="mt-3 text-gray-600">Возможно, она удалена или адрес введён с ошибкой.</p>
      <form action="/search" method="get" className="mx-auto mt-6 max-w-sm">
        <input name="q" aria-label="Искать животное" placeholder="Искать животное…" className="w-full rounded-xl border p-3" />
      </form>
      <nav aria-label="Куда перейти" className="mt-6 flex flex-wrap justify-center gap-3 text-blue-600">
        <Link href="/" className="underline">Главная</Link>
        <Link href="/animals" className="underline">Каталог</Link>
        <Link href="/organizations" className="underline">Приюты</Link>
        <Link href="/help-center" className="underline">Справка</Link>
      </nav>
    </div>
  );
}
