'use client';
import Link from 'next/link';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteAnimal } from '@/actions/animal';

const STATUS_LABEL: Record<string, string> = {
  pending_review: 'На проверке', published: 'Опубликовано', adopted: 'Пристроено', archived: 'В архиве',
};

export function MyAnimalRow({ id, title, status, editHref }: { id: string; title: string; status: string; editHref: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="flex items-center justify-between rounded-xl border p-3">
      <div>
        <p className="font-medium">{title}</p>
        <span className="text-sm text-gray-500">{STATUS_LABEL[status] ?? status}</span>
      </div>
      <div className="flex gap-2">
        <Link href={editHref} className="rounded-lg border px-3 py-1 text-sm">Редактировать</Link>
        {status !== 'archived' && (
          <button onClick={() => start(async () => { await deleteAnimal(id); router.refresh(); })} disabled={pending} className="rounded-lg border px-3 py-1 text-sm text-red-600">
            {pending ? '…' : 'Закрыть'}
          </button>
        )}
      </div>
    </div>
  );
}
