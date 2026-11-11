import { DonationForm } from '@/components/donate/DonationForm';
import { isDonationsEnabled } from '@/lib/payments/expresspay';

export const metadata = { title: 'Помощь в общий фонд' };
export const dynamic = 'force-dynamic'; // включённость приёма — по env в рантайме

export default function HelpGeneralPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Помощь в общий фонд</h1>
      <DonationForm targetType="general_fund" enabled={isDonationsEnabled()} />
    </main>
  );
}
