import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b">
      <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between" aria-label="Главная навигация">
        <Link href="/" className="text-xl font-bold">
          Pet Aggregator BY
        </Link>
        <div className="flex flex-wrap justify-end gap-x-4 gap-y-1">
          <Link href="/animals">Животные</Link>
          <Link href="/organizations">Приюты</Link>
          <Link href="/help">Помочь</Link>
          <Link href="/legal">Юр.помощь</Link>
          <Link href="/report-cruelty" className="text-red-600 hover:underline">Сообщить о жестокости</Link>
          <Link href="/login">Войти</Link>
        </div>
      </nav>
    </header>
  );
}
