'use client';
import { useState } from 'react';
import { TurnstileWidget } from '@/components/security/TurnstileWidget';

export function CrueltyReportForm() {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('sending'); setError('');
    const res = await fetch('/api/public/cruelty-reports', { method: 'POST', body: new FormData(e.currentTarget) });
    if (res.ok) setState('done');
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Ошибка отправки'); setState('error'); }
  }

  if (state === 'done') return <p className="rounded-xl bg-green-50 p-4 text-green-700">Спасибо. Сообщение получено, мы свяжемся при необходимости.</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <textarea name="description" required minLength={20} rows={6} placeholder="Опишите ситуацию: что, где, когда" className="w-full rounded-xl border p-3" />
      <input name="contact" placeholder="Ваш контакт (необязательно)" className="w-full rounded-xl border p-3" />
      <TurnstileWidget />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={state === 'sending'} className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white disabled:opacity-50">
        {state === 'sending' ? 'Отправка…' : 'Отправить сообщение'}
      </button>
    </form>
  );
}
