'use client';
import { useState, useTransition } from 'react';
import { updateInquiryStatus } from '@/actions/inquiry';

const STATUS_LABEL: Record<string, string> = { new: 'Новая', contacted: 'На связи', closed: 'Закрыта' };

const NEXT: Record<string, { value: 'contacted' | 'closed'; label: string } | null> = {
  new: { value: 'contacted', label: 'Отметить «на связи»' },
  contacted: { value: 'closed', label: 'Закрыть заявку' },
  closed: null,
};

export function InquiryRow({ id, animalTitle, applicantName, phone, telegram, message, initialStatus }: {
  id: string; animalTitle: string; applicantName?: string; phone?: string; telegram?: string; message: string; initialStatus: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [pending, start] = useTransition();
  const next = NEXT[status];

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium">{animalTitle}</p>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{STATUS_LABEL[status] ?? status}</span>
      </div>
      <p className="mt-1 text-sm text-gray-700">{message}</p>
      <p className="mt-1 text-sm text-gray-500">
        {applicantName ? `${applicantName} · ` : ''}{phone ? <a href={`tel:${phone}`} className="text-blue-600">{phone}</a> : null}{telegram ? ` · ${telegram}` : ''}
      </p>
      {next && (
        <button
          onClick={() => start(async () => { const r = await updateInquiryStatus(id, next.value); if (r.ok) setStatus(next.value); })}
          disabled={pending}
          className="mt-2 rounded-lg border px-3 py-1 text-sm"
        >
          {pending ? '…' : next.label}
        </button>
      )}
    </div>
  );
}
