'use client';
import { useState } from 'react';
import { TurnstileWidget } from '@/components/security/TurnstileWidget';
import { PRESET_AMOUNTS } from '@/lib/payments/amounts';

interface Props {
  targetType: 'organization' | 'animal' | 'general_fund';
  targetSlug?: string;
  targetTitle?: string;
  enabled: boolean; // есть ли ключи ExpressPay (решает сервер)
}

const field = 'w-full rounded-xl border p-3';

export function DonationForm({ targetType, targetSlug, targetTitle, enabled }: Props) {
  const [amount, setAmount] = useState('25');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [erip, setErip] = useState<string | null>(null);

  if (!enabled) {
    return (
      <div className="rounded-xl border bg-gray-50 p-4 text-gray-700">
        Приём пожертвований скоро заработает. Пока можно помочь, связавшись с приютом напрямую.
      </div>
    );
  }

  if (erip) {
    return (
      <div className="space-y-2 rounded-xl border p-4">
        <p className="font-semibold">Счёт создан. Оплатите его в ЕРИП</p>
        <p>В интернет-банке, банкомате или кассе выберите оплату через ЕРИП и укажите номер заказа:</p>
        <p className="text-2xl font-bold tracking-wide">{erip}</p>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    fd.set('amount', amount);
    fd.set('targetType', targetType);
    if (targetSlug) fd.set('targetSlug', targetSlug);
    const res = await fetch('/api/donations/expresspay', { method: 'POST', body: fd }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok && d.paymentUrl) {
      window.location.href = d.paymentUrl;
      return;
    }
    if (res?.ok && d.eripNumber) {
      setErip(d.eripNumber);
      return;
    }
    setError(d.error ?? 'Не удалось создать платёж. Попробуйте позже.');
    setSending(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {targetTitle && <p className="text-gray-600">Помощь: <b>{targetTitle}</b></p>}

      <div className="flex flex-wrap items-center gap-2">
        {PRESET_AMOUNTS.map((p) => (
          <button type="button" key={p} onClick={() => setAmount(String(p))} aria-pressed={amount === String(p)}
            className={`rounded-xl border-2 px-4 py-2 font-semibold ${amount === String(p) ? 'border-blue-600 text-blue-600' : 'border-gray-300'}`}>
            {p} BYN
          </button>
        ))}
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal"
          aria-label="Своя сумма, BYN" className="w-28 rounded-xl border p-2" placeholder="Своя" />
      </div>

      <select name="purpose" aria-label="На что" className={field}>
        <option value="На общее">На общее</option>
        <option value="На корм">На корм</option>
        <option value="На лечение">На лечение</option>
      </select>

      <input name="donorName" aria-label="Ваше имя (необязательно)" placeholder="Ваше имя (необязательно)" className={field} />
      <input name="donorEmail" type="email" aria-label="Email для чека (необязательно)" placeholder="Email для чека (необязательно)" className={field} />
      <input name="donorPhone" type="tel" aria-label="Телефон (необязательно)" placeholder="Телефон (необязательно)" className={field} />

      <TurnstileWidget />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={sending} className="w-full rounded-xl bg-green-600 px-6 py-3 font-semibold text-white disabled:opacity-50">
        {sending ? 'Создаём платёж…' : 'Перейти к оплате'}
      </button>
      <p className="text-xs text-gray-500">Оплата картой или через ЕРИП (ExpressPay). Деньги идут напрямую на цели проекта и приютов.</p>
    </form>
  );
}
