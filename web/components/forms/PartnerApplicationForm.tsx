'use client';
import { useState } from 'react';
import { TurnstileWidget } from '@/components/security/TurnstileWidget';

export function PartnerApplicationForm() {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('sending'); setError('');
    const res = await fetch('/api/public/partner-applications', { method: 'POST', body: new FormData(e.currentTarget) });
    if (res.ok) setState('done');
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Ошибка'); setState('error'); }
  }

  if (state === 'done') return <p className="rounded-xl bg-green-50 p-4 text-green-700">Заявка отправлена. Мы свяжемся с вами.</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input name="name" required placeholder="Название организации" className="w-full rounded-xl border p-3" />
      <input name="unp" placeholder="УНП (9 цифр)" className="w-full rounded-xl border p-3" />
      <input name="contact" required placeholder="Контакт: телефон / email / Telegram" className="w-full rounded-xl border p-3" />
      <input name="links" placeholder="Ссылки на соцсети / сайт" className="w-full rounded-xl border p-3" />
      <textarea name="message" rows={4} placeholder="Коротко о вас (необязательно)" className="w-full rounded-xl border p-3" />
      <TurnstileWidget />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={state === 'sending'} className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-50">
        {state === 'sending' ? 'Отправка…' : 'Подключить приют'}
      </button>
    </form>
  );
}
