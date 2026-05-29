import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b">
      <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between" aria-label="Главная навигация">
        <Link href="/" className="text-xl font-bold">
          Pet Aggregator BY
        </Link>
        <div className="flex gap-4">
          <Link href="/animals">Животные</Link>
          <Link href="/organizations">Приюты</Link>
          <Link href="/help">Помочь</Link>
          <Link href="/legal">Юр.помощь</Link>
          <Link href="/login">Войти</Link>
        </div>
      </nav>
    </header>
  );
}
