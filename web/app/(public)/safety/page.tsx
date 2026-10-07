import { HelpArticleList } from '@/components/content/HelpArticleList';

export const metadata = { title: 'Безопасность', description: 'Как безопасно передавать животное и не попасть на мошенников.' };
export const dynamic = 'force-dynamic';

export default function SafetyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Безопасность</h1>
      <HelpArticleList category="safety" />
    </div>
  );
}
