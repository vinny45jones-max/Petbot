import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/current-user';

export async function Header() {
  // сбой чтения сессии не должен ронять шапку (а с ней и всю страницу)
  const user = await getCurrentUser().catch(() => null);
  return (
    <header className="border-b">
      <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between" aria-label="Главная навигация">
        <Link href="/" className="text-xl font-bold">
          Pet Aggregator BY
        </Link>
        <div className="flex flex-wrap justify-end gap-x-4 gap-y-1">
          <Link href="/animals">Животные</Link>
          <Link href="/organizations">Приюты</Link>
          {/* раздел «Помочь» (донаты) появится в Plan 5 — до тех пор ссылка вела на 404 */}
          <Link href="/how-it-works">Как это работает</Link>
          <Link href="/legal">Юр.помощь</Link>
          <Link href="/report-cruelty" className="text-red-600 hover:underline">Сообщить о жестокости</Link>
          {user ? <Link href="/me" className="font-semibold">Кабинет</Link> : <Link href="/login">Войти</Link>}
        </div>
      </nav>
    </header>
  );
}
