import { HelpArticleList } from '@/components/content/HelpArticleList';

export const metadata = { title: 'Как это работает', description: 'Как найти питомца, разместить животное и помочь приюту.' };
export const dynamic = 'force-dynamic';

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Как это работает</h1>
      <HelpArticleList category="how_it_works" />
    </div>
  );
}
