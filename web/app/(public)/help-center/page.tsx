import { HelpArticleList } from '@/components/content/HelpArticleList';

export const metadata = { title: 'Справочный центр', description: 'Инструкции по работе с сайтом.' };
export const dynamic = 'force-dynamic';

export default function HelpCenterPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Справочный центр</h1>
      <HelpArticleList category="guide" />
    </div>
  );
}
