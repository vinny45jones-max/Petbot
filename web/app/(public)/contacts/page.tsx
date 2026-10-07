import { PartnerApplicationForm } from '@/components/forms/PartnerApplicationForm';

export const metadata = { title: 'Контакты и подключение приюта', description: 'Свяжитесь с нами или подайте заявку на подключение приюта к платформе.' };

export default function ContactsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold">Контакты</h1>
      <p className="mt-4 text-gray-600">По общим вопросам пишите на <a href="mailto:info@pet-aggregator.by" className="text-blue-600">info@pet-aggregator.by</a>.</p>

      <section className="mt-10">
        <h2 className="mb-2 text-xl font-semibold">Подключить приют</h2>
        <p className="mb-4 text-gray-600">Если вы представляете приют или службу отлова — оставьте заявку, и мы создадим вам кабинет.</p>
        <PartnerApplicationForm />
      </section>
    </div>
  );
}
