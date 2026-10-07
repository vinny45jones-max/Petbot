import { HelpArticleList } from '@/components/content/HelpArticleList';

export const metadata = { title: 'Частые вопросы (FAQ)', description: 'Ответы на популярные вопросы о размещении и усыновлении животных.' };
export const dynamic = 'force-dynamic';

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Частые вопросы</h1>
      <HelpArticleList category="faq" />
    </div>
  );
}
