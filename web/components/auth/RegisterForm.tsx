'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [ageConfirmed, setAge] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ageConfirmed) { setError('Нужно подтвердить возраст 14+'); return; }
    if (!consent) { setError('Нужно согласие на обработку перс.данных (закон 99-З)'); return; }
    setLoading(true);
    const r = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, firstName, ageConfirmed, consentPersonalData: consent, role: 'citizen' }),
    });
    setLoading(false);
    if (r.ok) window.location.href = '/verify-email?sent=1';
    else setError('Ошибка регистрации. Возможно email уже используется.');
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-sm">
      <div>
        <Label htmlFor="firstName">Имя</Label>
        <Input id="firstName" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="password">Пароль</Label>
        <Input id="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        <p className="text-xs text-muted-foreground mt-1">Минимум 8 символов</p>
      </div>
      <div className="flex items-start gap-2">
        <input id="age" type="checkbox" checked={ageConfirmed} onChange={(e) => setAge(e.target.checked)} required className="mt-1" />
        <Label htmlFor="age" className="text-sm">Мне 14 лет или больше</Label>
      </div>
      <div className="flex items-start gap-2">
        <input id="consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required className="mt-1" />
        <Label htmlFor="consent" className="text-sm">Даю согласие на обработку персональных данных по закону РБ 99-З</Label>
      </div>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">{loading ? 'Регистрация...' : 'Зарегистрироваться'}</Button>
    </form>
  );
}
