'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdoptModal({ animalId, defaultPhone, defaultTelegram, triggerLabel = 'Хочу взять домой', accent = false }: { animalId: string; defaultPhone?: string; defaultTelegram?: string; triggerLabel?: string; accent?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState(defaultPhone ?? '');
  const [telegram, setTelegram] = useState(defaultTelegram ?? '');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  async function submit() {
    setState('sending');
    const res = await fetch('/api/inquiries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ animalId, message, phone, telegram }),
    });
    if (res.status === 401) { router.push('/login'); return; }
    setState(res.ok ? 'done' : 'error');
  }

  if (!open) {
    const cls = accent
      ? 'rounded-xl bg-red-600 px-6 py-3 font-semibold text-white ring-2 ring-red-300 animate-pulse'
      : 'rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white';
    return <button onClick={() => setOpen(true)} className={cls}>{triggerLabel}</button>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Заявка на усыновление">
      <div className="w-full max-w-md rounded-2xl bg-white p-5">
        {state === 'done' ? (
          <div>
            <h2 className="mb-2 text-lg font-bold">Заявка отправлена</h2>
            <p className="text-gray-600">Владелец свяжется с вами. Заявка видна в разделе «Мои заявки».</p>
            <button onClick={() => setOpen(false)} className="mt-4 rounded-lg border px-4 py-2">Закрыть</button>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-lg font-bold">Заявка на усыновление</h2>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Коротко о себе и почему хотите взять" rows={4} className="w-full rounded-lg border px-2 py-1" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Телефон" className="w-full rounded-lg border px-2 py-1" />
            <input value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="Telegram" className="w-full rounded-lg border px-2 py-1" />
            {state === 'error' && <p className="text-sm text-red-600">Не удалось отправить. Попробуйте позже.</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2">Отмена</button>
              <button onClick={submit} disabled={state === 'sending' || message.trim().length < 1} className="rounded-lg bg-blue-600 px-4 py-2 text-white">{state === 'sending' ? 'Отправка…' : 'Отправить'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
