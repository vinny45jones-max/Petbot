import Link from 'next/link';
import { CrueltyReportForm } from '@/components/forms/CrueltyReportForm';

export const metadata = { title: 'Сообщить о жестоком обращении', description: 'Куда обращаться при жестоком обращении с животными в Беларуси: МВД, ветстанции, нормы закона.' };

export default function ReportCrueltyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold">Сообщить о жестоком обращении</h1>

      <section className="mt-6 rounded-2xl bg-amber-50 p-4">
        <h2 className="font-semibold">Куда обращаться</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-gray-800">
          <li>Милиция — <a href="tel:102" className="text-blue-600">102</a> (при явной угрозе жизни животного/человека)</li>
          <li>Местная ветеринарная станция — фиксация состояния животного</li>
          <li>Районная администрация / служба ЖКХ — по вопросам содержания и отлова</li>
        </ul>
        <p className="mt-3 text-sm text-gray-600">
          Правовая база: ст. 339-1 УК РБ (жестокое обращение), ст. 16.29 КоАП, Закон от 01.04.2024 № 361-З «Об ответственном обращении с животными». Подробнее — в <Link href="/legal" className="text-blue-600 underline">юридическом разделе</Link>.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-semibold">Сообщить нам</h2>
        <p className="mb-4 text-gray-600">Можно анонимно. Мы не публикуем обращения, используем их для помощи и связи с компетентными органами.</p>
        <CrueltyReportForm />
      </section>
    </div>
  );
}
