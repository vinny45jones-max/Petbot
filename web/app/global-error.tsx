'use client';
import { Inter } from 'next/font/google';
import './globals.css';
import { Button } from '@/components/ui/button';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

// Последний рубеж: ловит ошибки в самих root-layout. Заменяет всё дерево,
// поэтому рендерит собственные <html>/<body>. Нужен, т.к. общего
// app/layout.tsx нет (multiple root layouts).
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="ru-BY">
      <body className={inter.className}>
        <main className="max-w-6xl mx-auto px-4 py-24 text-center">
          <h1 className="text-6xl font-bold mb-4">500</h1>
          <p className="text-xl mb-8">Что-то пошло не так</p>
          <Button onClick={reset}>Попробовать снова</Button>
        </main>
      </body>
    </html>
  );
}
