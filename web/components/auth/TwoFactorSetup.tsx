'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ERRORS: Record<string, string> = {
  invalid_code: 'Неверный код, попробуйте ещё раз.',
  rate_limited: 'Слишком много попыток. Подождите 15 минут.',
  already_enabled: '2FA уже включена.',
  not_enrolled: 'Сначала отсканируйте QR-код.',
};

async function post(url: string, token?: string) {
  const r = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
  }).catch(() => null);
  const d = r ? await r.json().catch(() => ({})) : {};
  return { ok: Boolean(r?.ok), d };
}

const input = 'w-40 rounded-md border px-3 py-2 font-mono';
const btn = 'rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50';

export function TwoFactorSetup({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [qr, setQr] = useState<{ img: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [error, setError] = useState('');

  const fail = (d: { error?: string }) => setError(ERRORS[d.error ?? ''] ?? 'Не получилось, попробуйте позже.');

  async function start() {
    setError('');
    const { ok, d } = await post('/api/auth/2fa/enroll');
    if (ok) setQr({ img: d.qrDataUrl, secret: d.secret }); else fail(d);
  }
  async function activate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const { ok, d } = await post('/api/auth/2fa/activate', code);
    if (ok) setRecovery(d.recoveryCodes); else fail(d);
  }
  async function disable(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const { ok, d } = await post('/api/auth/2fa/disable', code);
    if (ok) { setCode(''); router.refresh(); } else fail(d);
  }

  const err = error && <p role="alert" className="text-sm text-red-600">{error}</p>;

  if (recovery) {
    return (
      <div className="space-y-3">
        <p className="text-green-700">2FA включена.</p>
        <p className="font-medium">Сохраните резервные коды. Они показываются один раз, каждый работает один раз:</p>
        <ul data-testid="recovery-codes" className="grid w-fit grid-cols-2 gap-x-6 gap-y-1 font-mono text-sm">
          {recovery.map((c) => <li key={c}>{c}</li>)}
        </ul>
        <button type="button" onClick={() => router.refresh()} className={btn}>Я сохранил коды</button>
      </div>
    );
  }

  if (enabled) {
    return (
      <form onSubmit={disable} className="space-y-3">
        <p className="text-green-700">Двухфакторная аутентификация включена.</p>
        <p className="text-sm">Чтобы выключить, введите код из приложения или резервный код:</p>
        <div className="flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value)} aria-label="Код" className={input} />
          <button type="submit" className="rounded-md border px-4 py-2 text-sm">Выключить 2FA</button>
        </div>
        {err}
      </form>
    );
  }

  return (
    <div className="space-y-3">
      {!qr ? (
        <button type="button" onClick={start} className={btn}>Настроить 2FA</button>
      ) : (
        <form onSubmit={activate} className="space-y-3">
          <p className="text-sm">Отсканируйте QR-код в приложении (Google Authenticator, Aegis, 1Password) и введите 6-значный код:</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URL QR-кода */}
          <img src={qr.img} alt="QR-код для приложения-аутентификатора" className="h-44 w-44" />
          <p className="text-xs text-gray-600">Не сканируется? Введите ключ вручную: <code data-testid="totp-secret" className="break-all">{qr.secret}</code></p>
          <div className="flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6}
              autoComplete="one-time-code" aria-label="Код из приложения" placeholder="000000" className={input} />
            <button type="submit" className={btn}>Подтвердить</button>
          </div>
        </form>
      )}
      {err}
    </div>
  );
}
