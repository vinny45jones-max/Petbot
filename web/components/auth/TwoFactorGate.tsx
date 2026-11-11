'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const ERRORS: Record<string, string> = {
  invalid_code: 'Неверный код.',
  rate_limited: 'Слишком много попыток. Подождите 15 минут.',
  unauthorized: 'Сначала войдите в аккаунт.',
};

// Открытый редирект не допускаем: только внутренние пути /admin…
function safeNext(raw: string | null): string {
  return raw && /^\/admin(\/|$|\?)/.test(raw) ? raw : '/admin';
}

export function TwoFactorGate() {
  const next = safeNext(useSearchParams().get('next'));
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notEnrolled, setNotEnrolled] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const r = await fetch('/api/auth/2fa/gate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: code }),
    }).catch(() => null);
    if (r?.ok) { window.location.assign(next); return; }
    const d = r ? await r.json().catch(() => ({})) : {};
    if (d.error === 'not_enrolled') setNotEnrolled(true);
    else setError(ERRORS[d.error] ?? 'Не получилось, попробуйте позже.');
  }

  if (notEnrolled) {
    return (
      <div className="mx-auto mt-16 max-w-sm space-y-3">
        <h1 className="text-xl font-semibold">Нужна двухфакторная аутентификация</h1>
        <p className="text-sm">Для входа в админку включите 2FA в разделе <Link href="/me/security" className="underline">Безопасность</Link>.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-16 max-w-sm space-y-3">
      <h1 className="text-xl font-semibold">Подтверждение входа</h1>
      <p className="text-sm text-gray-600">Введите код из приложения-аутентификатора или резервный код.</p>
      <input value={code} onChange={(e) => setCode(e.target.value)} autoFocus autoComplete="one-time-code"
        aria-label="Код подтверждения" placeholder="000000" className="w-full rounded-md border px-3 py-2 font-mono" />
      <button type="submit" className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white">Подтвердить</button>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
