import { RegisterForm } from '@/components/auth/RegisterForm';
import { TelegramLoginButton } from '@/components/auth/TelegramLoginButton';
import Link from 'next/link';

export const metadata = { title: 'Регистрация' };

export default function RegisterPage() {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || '';
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-6">Регистрация</h1>
      <RegisterForm />
      {botUsername && (
        <>
          <div className="my-6 flex items-center gap-2">
            <span className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">или</span>
            <span className="flex-1 h-px bg-border" />
          </div>
          <TelegramLoginButton botUsername={botUsername} />
        </>
      )}
      <div className="mt-6 text-sm">
        Уже есть аккаунт? <Link href="/login" className="text-primary underline">Войти</Link>
      </div>
    </div>
  );
}
