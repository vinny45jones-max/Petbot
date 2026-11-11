import Link from 'next/link';

export const metadata = { title: 'Помочь', description: 'Поддержите животных Беларуси: помощь конкретному животному, приюту или в общий фонд.' };

const cards = [
  { href: '/help/general', title: 'Общий фонд', desc: 'Помощь распределяется на самые срочные нужды.' },
  { href: '/animals', title: 'Конкретному животному', desc: 'Выберите животное и поддержите его лечение и содержание.' },
  { href: '/organizations', title: 'Приюту', desc: 'Поддержите приют или волонтёрскую организацию.' },
];

export default function HelpHubPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold">Помочь</h1>
      <p className="mb-8 text-gray-600">Любая сумма помогает спасать жизни. Оплата картой или через ЕРИП.</p>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="rounded-2xl border p-5 hover:shadow-md">
            <h2 className="font-semibold">{c.title}</h2>
            <p className="mt-1 text-sm text-gray-600">{c.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
