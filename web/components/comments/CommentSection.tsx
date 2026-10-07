'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TurnstileWidget } from '@/components/security/TurnstileWidget';

interface CommentDTO { id: string; body: string; authorName: string; createdAt: string }

async function fetchComments(targetType: string, targetId: string): Promise<CommentDTO[]> {
  const res = await fetch(`/api/public/comments/list?${new URLSearchParams({ targetType, targetId })}`);
  return res.ok ? ((await res.json()).comments ?? []) : [];
}

function ReportButton({ commentId }: { commentId: string }) {
  const [state, setState] = useState<'idle' | 'open' | 'sending' | 'done'>('idle');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  async function send() {
    setState('sending'); setError('');
    const res = await fetch('/api/public/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType: 'comment', targetId: commentId, reason }),
    });
    if (res.ok) setState('done');
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Ошибка'); setState('open'); }
  }

  if (state === 'done') return <p className="mt-2 text-sm text-gray-600">Жалоба отправлена</p>;
  if (state === 'idle') {
    return <button type="button" onClick={() => setState('open')} className="mt-2 text-sm text-gray-600 underline">Пожаловаться</button>;
  }
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} placeholder="Причина жалобы" aria-label="Причина жалобы" className="flex-1 rounded-lg border px-2 py-1 text-sm" />
      <button type="button" disabled={state === 'sending' || !reason.trim()} onClick={send} className="rounded-lg bg-gray-700 px-3 py-1 text-sm text-white disabled:opacity-50">Отправить жалобу</button>
      {error && <p className="w-full text-sm text-red-700">{error}</p>}
    </div>
  );
}

export function CommentSection({ targetType, targetId, isAuthed }: { targetType: 'animal' | 'blog_post'; targetId: string; isAuthed: boolean }) {
  const [comments, setComments] = useState<CommentDTO[]>([]);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchComments(targetType, targetId).then((list) => { if (alive) setComments(list); });
    return () => { alive = false; };
  }, [targetType, targetId]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setSending(true); setError('');
    const fd = new FormData(form);
    fd.set('targetType', targetType); fd.set('targetId', targetId);
    const res = await fetch('/api/public/comments', { method: 'POST', body: fd });
    if (res.ok) { form.reset(); setComments(await fetchComments(targetType, targetId)); }
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Ошибка'); }
    setSending(false);
  }

  return (
    <section className="mx-auto mt-10 max-w-3xl px-4 pb-10">
      <h2 className="mb-4 text-xl font-semibold">Комментарии</h2>
      <ul className="space-y-3">
        {comments.map((c) => (
          <li key={c.id} className="rounded-xl border p-3">
            <p className="text-sm font-medium">{c.authorName}</p>
            <p className="whitespace-pre-wrap">{c.body}</p>
            {isAuthed && <ReportButton commentId={c.id} />}
          </li>
        ))}
        {!comments.length && <li className="text-gray-600">Будьте первым, кто оставит комментарий.</li>}
      </ul>

      {isAuthed ? (
        <form onSubmit={onSubmit} className="mt-4 space-y-2">
          <textarea name="body" required rows={3} maxLength={2000} placeholder="Ваш комментарий" aria-label="Ваш комментарий" className="w-full rounded-xl border p-3" />
          <TurnstileWidget />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button disabled={sending} className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white disabled:opacity-50">{sending ? 'Отправка…' : 'Отправить'}</button>
        </form>
      ) : (
        <p className="mt-4 text-gray-600">Чтобы оставить комментарий, <Link href="/login" className="text-blue-600 underline">войдите</Link>.</p>
      )}
    </section>
  );
}
