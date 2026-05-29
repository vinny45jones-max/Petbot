'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function MagicLinkForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/auth/magic-link/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    setSent(true);
  }
  if (sent) return <p>Ссылка отправлена на email если аккаунт существует. Проверьте почту.</p>;
  return (
    <form onSubmit={submit} className="space-y-3 max-w-sm">
      <Label htmlFor="ml-email">Войти по ссылке без пароля</Label>
      <Input id="ml-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Button type="submit">Отправить ссылку</Button>
    </form>
  );
}
