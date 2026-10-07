'use client';
import Link from 'next/link';

// Error boundary группы (public): рендерится внутри (public)/layout.tsx,
// поэтому <html>/<body>/Header/Footer уже на месте. Катастрофические ошибки
// в самом root-layout ловит app/global-error.tsx.
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="text-sm font-semibold text-gray-600">Ошибка 500</p>
      <h1 className="mt-2 text-3xl font-bold">Что-то пошло не так</h1>
      <p className="mt-3 text-gray-600">Мы уже разбираемся. Попробуйте обновить страницу или вернуться на главную.</p>
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={reset} className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white">Обновить</button>
        <Link href="/" className="rounded-xl border-2 border-gray-300 px-5 py-2 font-semibold">На главную</Link>
      </div>
    </div>
  );
}
