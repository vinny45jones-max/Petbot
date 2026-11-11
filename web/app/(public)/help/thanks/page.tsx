import Link from 'next/link';

export const metadata = { title: 'Спасибо за помощь', robots: { index: false } };

export default function ThanksPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold">Спасибо за помощь! 🐾</h1>
      <p className="mt-3 text-gray-600">Чек придёт на email, если вы его указали. Платёж может подтвердиться в течение нескольких минут.</p>
      <Link href="/animals" className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white">Смотреть животных</Link>
    </main>
  );
}
