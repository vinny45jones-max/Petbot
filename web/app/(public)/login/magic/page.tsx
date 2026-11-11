import Link from 'next/link';
import { AutoSubmitForm } from '@/components/auth/AutoSubmitForm';

// Ссылка из письма ведёт сюда, а не прямо в API: токен одноразовый, а GET повторяют сам Chrome
// (Critical-CH от withPayload) и почтовые сканеры ссылок. Тратит токен только POST формы.
export const metadata = { title: 'Вход по ссылке', robots: { index: false }, referrer: 'no-referrer' };

const ERRORS: Record<string, string> = {
  'missing-token': 'В ссылке нет кода входа.',
  'invalid-token': 'Ссылка уже использована или неверна.',
  expired: 'Срок действия ссылки истёк (15 минут).',
};

export default async function MagicLoginPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const sp = await searchParams;
  if (sp.error || !sp.token) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold mb-4">Не получилось войти</h1>
        <p className="mb-6">{ERRORS[sp.error ?? 'missing-token'] ?? ERRORS['invalid-token']} Запросите новую ссылку.</p>
        <Link href="/login" className="text-primary underline">Ко входу</Link>
      </div>
    );
  }
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-4">Вход по ссылке</h1>
      <AutoSubmitForm action="/api/auth/magic-link/consume" fields={{ token: sp.token }}>
        <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded">Войти</button>
      </AutoSubmitForm>
    </div>
  );
}
