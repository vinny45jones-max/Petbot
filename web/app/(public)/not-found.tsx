import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

// Рендерится внутри (public)/layout.tsx (html/body/Header/Footer уже есть),
// поэтому это только контент. Срабатывает на notFound() в (public)-маршрутах
// и на catch-all [...not-found] для несопоставленных URL.
export default function NotFound() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-24 text-center">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-xl mb-8">Страница не найдена</p>
      <Link href="/" className={buttonVariants()}>
        На главную
      </Link>
    </main>
  );
}
