import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isAccountNo } from '@/lib/payments/donation';

export const metadata = { title: 'Оплата через ЕРИП', robots: { index: false, follow: false } };

// «%25» и прочий битый escape: decodeURIComponent бросает URIError → было 500 вместо 404 (И-27)
function safeDecode(s: string): string | null {
  try {
    return decodeURIComponent(s);
  } catch {
    return null;
  }
}

export default async function EripHelpPage({ params }: { params: Promise<{ number: string }> }) {
  const number = safeDecode((await params).number);
  if (number === null || !isAccountNo(number)) notFound();
  const serviceCode = process.env.EXPRESSPAY_ERIP_SERVICE_CODE;
  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-10">
      <h1 className="text-2xl font-bold">Оплата через ЕРИП</h1>
      <p>Счёт создан. Оплатите его в интернет-банке, мобильном банке, банкомате, инфокиоске или кассе банка через систему «Расчёт» (ЕРИП):</p>
      <ol className="list-decimal space-y-2 pl-6">
        <li>Откройте раздел «Система “Расчёт” (ЕРИП)».</li>
        <li>
          {serviceCode
            ? <>Найдите услугу по коду <strong className="font-mono">{serviceCode}</strong>.</>
            : <>Найдите услугу Pet Aggregator BY через поиск по названию.</>}
        </li>
        <li>Введите номер заказа: <strong data-testid="erip-number" className="font-mono text-lg">{number}</strong></li>
        <li>Проверьте сумму и подтвердите оплату.</li>
      </ol>
      <p className="rounded-md bg-gray-50 p-3 text-sm">
        Счёт действует 7 дней. После оплаты пожертвование отметится автоматически, чек придёт на почту, если вы её указали.
      </p>
      <Link href="/help" className="inline-block underline">Вернуться к разделу «Помочь»</Link>
    </div>
  );
}
