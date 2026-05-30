'use client';
import type { ChangeEvent } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const OPTIONS = [
  { value: 'urgent', label: 'Сначала срочные' },
  { value: 'new', label: 'Сначала новые' },
  { value: 'longest', label: 'Дольше всех ждут' },
];

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = sp.get('sort') ?? 'urgent';

  function onChange(e: ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(sp.toString());
    if (e.target.value === 'urgent') next.delete('sort');
    else next.set('sort', e.target.value);
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-gray-600">Сортировка:</span>
      <select value={current} onChange={onChange} className="rounded-lg border px-2 py-1">
        {OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
