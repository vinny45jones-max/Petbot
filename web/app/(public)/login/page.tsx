import { LoginForm } from '@/components/auth/LoginForm';
import { TelegramLoginButton } from '@/components/auth/TelegramLoginButton';
import Link from 'next/link';

export const metadata = { title: 'Войти' };

export default function LoginPage() {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || '';
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-6">Войти</h1>
      {botUsername && (
        <>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">Войти через Telegram</p>
            <TelegramLoginButton botUsername={botUsername} />
          </div>
          <div className="my-6 flex items-center gap-2">
            <span className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">или</span>
            <span className="flex-1 h-px bg-border" />
          </div>
        </>
      )}
      <LoginForm />
      <div className="mt-6 text-sm flex justify-between">
        <Link href="/forgot-password" className="text-primary underline">Забыли пароль?</Link>
        <Link href="/register" className="text-primary underline">Регистрация</Link>
      </div>
    </div>
  );
}
