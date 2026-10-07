import Link from 'next/link';

export function HomeSection({ title, moreHref, children }: { title: string; moreHref: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-end justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <Link href={moreHref} className="font-semibold text-blue-600 hover:underline">Смотреть все →</Link>
      </div>
      {children}
    </section>
  );
}
