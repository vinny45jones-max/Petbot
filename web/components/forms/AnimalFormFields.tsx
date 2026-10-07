'use client';
import type { AnimalDraft } from '@/lib/animal-form';

interface CityOption { id: string; nameRu: string }

const SPECIES = [{ v: 'dog', l: 'Собака' }, { v: 'cat', l: 'Кошка' }, { v: 'other', l: 'Другое' }];
const SEX = [{ v: 'male', l: 'Мальчик' }, { v: 'female', l: 'Девочка' }, { v: 'unknown', l: 'Неизвестно' }];
const SIZE = [{ v: 'small', l: 'Маленький' }, { v: 'medium', l: 'Средний' }, { v: 'large', l: 'Большой' }];

export function AnimalFormFields({ draft, setDraft, cities, errors }: {
  draft: AnimalDraft; setDraft: (d: AnimalDraft) => void; cities: CityOption[]; errors: Record<string, string>;
}) {
  const upd = (patch: Partial<AnimalDraft>) => setDraft({ ...draft, ...patch });
  return (
    <div className="space-y-4">
      <div>
        <label className="block font-medium">Вид *</label>
        <div className="flex gap-3">
          {SPECIES.map((s) => (
            <label key={s.v} className="inline-flex items-center gap-1">
              <input type="radio" name="species" checked={draft.species === s.v} onChange={() => upd({ species: s.v as any })} /> {s.l}
            </label>
          ))}
        </div>
        {errors.species && <p className="text-sm text-red-600">{errors.species}</p>}
      </div>

      <div className="flex gap-4">
        <div>
          <label className="block font-medium">Пол</label>
          <select value={draft.sex ?? 'unknown'} onChange={(e) => upd({ sex: e.target.value as any })} className="rounded-lg border px-2 py-1">
            {SEX.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </div>
        <div>
          <label className="block font-medium">Размер</label>
          <select value={draft.size ?? ''} onChange={(e) => upd({ size: e.target.value as any })} className="rounded-lg border px-2 py-1">
            <option value="">—</option>
            {SIZE.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-4">
        <label className="block">Лет <input type="number" min={0} max={40} value={draft.ageYears ?? ''} onChange={(e) => upd({ ageYears: e.target.value ? Number(e.target.value) : undefined })} className="w-20 rounded-lg border px-2 py-1" /></label>
        <label className="block">Месяцев <input type="number" min={0} max={11} value={draft.ageMonths ?? ''} onChange={(e) => upd({ ageMonths: e.target.value ? Number(e.target.value) : undefined })} className="w-20 rounded-lg border px-2 py-1" /></label>
      </div>

      <div>
        <label className="block font-medium">Имя (необязательно)</label>
        <input value={draft.name ?? ''} onChange={(e) => upd({ name: e.target.value })} className="w-full rounded-lg border px-2 py-1" />
      </div>

      <div>
        <label className="block font-medium">Город *</label>
        <select value={draft.city ?? ''} onChange={(e) => upd({ city: e.target.value })} className="w-full rounded-lg border px-2 py-1">
          <option value="">Выберите город</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.nameRu}</option>)}
        </select>
        {errors.city && <p className="text-sm text-red-600">{errors.city}</p>}
      </div>

      <div>
        <label htmlFor="animal-description" className="block font-medium">Описание *</label>
        <textarea id="animal-description" value={draft.description ?? ''} onChange={(e) => upd({ description: e.target.value })} rows={4} className="w-full rounded-lg border px-2 py-1" />
        {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
      </div>

      <div className="flex gap-4">
        <div>
          <label className="block font-medium">Телефон</label>
          <input value={draft.contactPhone ?? ''} onChange={(e) => upd({ contactPhone: e.target.value })} placeholder="+375XXXXXXXXX" className="rounded-lg border px-2 py-1" />
          {errors.contactPhone && <p className="text-sm text-red-600">{errors.contactPhone}</p>}
        </div>
        <div>
          <label className="block font-medium">Telegram</label>
          <input value={draft.contactTelegram ?? ''} onChange={(e) => upd({ contactTelegram: e.target.value })} placeholder="@username" className="rounded-lg border px-2 py-1" />
        </div>
      </div>
      {errors.contact && <p className="text-sm text-red-600">{errors.contact}</p>}
    </div>
  );
}
