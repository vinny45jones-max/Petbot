'use client';
import { useState } from 'react';

const ERRORS: Record<string, string> = {
  wrong_password: 'Текущий пароль неверный.',
  weak_password: 'Новый пароль — минимум 8 символов.',
  same_password: 'Новый пароль совпадает с текущим.',
  rate_limited: 'Слишком много попыток. Подождите 15 минут.',
  mismatch: 'Новые пароли не совпадают.',
};
const input = 'w-full max-w-sm rounded-md border px-3 py-2';

export function ChangePasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setDone(false);
    if (next !== repeat) { setError(ERRORS.mismatch); return; }
    setSending(true);
    const r = await fetch('/api/account/password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current, next }),
    }).catch(() => null);
    setSending(false);
    if (r?.ok) { setDone(true); setCurrent(''); setNext(''); setRepeat(''); return; }
    const d = r ? await r.json().catch(() => ({})) : {};
    setError(ERRORS[d.error] ?? 'Не получилось, попробуйте позже.');
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-sm">Текущий пароль
        <input type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} className={input} />
      </label>
      <label className="block text-sm">Новый пароль (минимум 8 символов)
        <input type="password" autoComplete="new-password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} className={input} />
      </label>
      <label className="block text-sm">Повторите новый пароль
        <input type="password" autoComplete="new-password" required minLength={8} value={repeat} onChange={(e) => setRepeat(e.target.value)} className={input} />
      </label>
      <button type="submit" disabled={sending} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {sending ? 'Сохраняем…' : 'Сменить пароль'}
      </button>
      {done && <p role="status" className="text-sm text-green-700">Пароль изменён. Входы на других устройствах завершены.</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
