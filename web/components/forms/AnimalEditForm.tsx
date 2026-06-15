'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimalFormFields } from './AnimalFormFields';
import { validateAnimalDraft, type AnimalDraft } from '@/lib/animal-form';
import { updateAnimal } from '@/actions/animal';

interface CityOption { id: string; nameRu: string }

export function AnimalEditForm({ id, initial, cities, backHref }: { id: string; initial: AnimalDraft; cities: CityOption[]; backHref: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<AnimalDraft>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function save() {
    // при редактировании фото не трогаем (photoCount берём из initial, чтобы валидация описания/контакта прошла)
    const v = validateAnimalDraft({ ...draft, photoCount: initial.photoCount ?? 1 });
    if (!v.ok) { setErrors(v.errors); return; }
    setSaving(true);
    const res = await updateAnimal(id, {
      name: draft.name, description: draft.description, healthStatus: draft.healthStatus,
      size: draft.size, sex: draft.sex, ageYears: draft.ageYears, ageMonths: draft.ageMonths,
    });
    setSaving(false);
    if (res.ok) router.push(backHref);
    else setErrors(res.errors);
  }

  return (
    <div className="max-w-2xl">
      <AnimalFormFields draft={draft} setDraft={setDraft} cities={cities} errors={errors} />
      {errors.auth && <p className="text-sm text-red-600">{errors.auth}</p>}
      <button onClick={save} disabled={saving} className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-white">{saving ? 'Сохранение…' : 'Сохранить'}</button>
    </div>
  );
}
