import Link from 'next/link';

export const metadata = { title: 'Платёж не завершён', robots: { index: false } };

export default function FailedPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold">Платёж не завершён</h1>
      <p className="mt-3 text-gray-600">Оплата не прошла. Попробуйте ещё раз или выберите другой способ оплаты.</p>
      <Link href="/help" className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white">Попробовать ещё раз</Link>
    </main>
  );
}
