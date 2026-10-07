'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PhotoUpload, type UploadedPhoto } from './PhotoUpload';
import { AnimalFormFields } from './AnimalFormFields';
import { validateAnimalDraft, type AnimalDraft } from '@/lib/animal-form';
import { createAnimal } from '@/actions/animal';

interface CityOption { id: string; nameRu: string }
interface FacilityOption { id: string; name: string }

export function AnimalWizard({ cities, organizationId, successRedirect = '/me/animals', facilities = [] }: { cities: CityOption[]; organizationId?: string; successRedirect?: string; facilities?: FacilityOption[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [draft, setDraft] = useState<AnimalDraft>({ sex: 'unknown' });
  const [intakeFacilityId, setIntakeFacilityId] = useState('');
  const [intakeDate, setIntakeDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function next() {
    if (step === 1 && photos.length === 0) { setErrors({ photos: 'Добавьте хотя бы одно фото' }); return; }
    setErrors({});
    setStep((s) => Math.min(4, s + 1));
  }

  async function submit() {
    const full = { ...draft, photoCount: photos.length };
    const v = validateAnimalDraft(full);
    if (!v.ok) { setErrors(v.errors); return; }
    setSubmitting(true);
    const res = await createAnimal({ ...draft, mediaIds: photos.map((p) => p.id), organizationId, intakeFacilityId: intakeFacilityId || undefined, intakeDate: intakeDate || undefined });
    setSubmitting(false);
    if (res.ok) router.push(`${successRedirect}?created=1`);
    else setErrors(res.errors);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-4 text-sm text-gray-500">Шаг {step} из 4</p>

      {step === 1 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Фото</h2>
          <PhotoUpload value={photos} onChange={setPhotos} />
          {errors.photos && <p className="text-sm text-red-600">{errors.photos}</p>}
        </section>
      )}

      {step >= 2 && step <= 3 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">{step === 2 ? 'О животном' : 'Описание и контакт'}</h2>
          <AnimalFormFields draft={draft} setDraft={setDraft} cities={cities} errors={errors} />
          {step === 2 && facilities.length > 0 && (
            <div className="mt-4 rounded-xl border-l-4 border-red-300 bg-red-50 p-3">
              <label className="block font-medium">Служба отлова (если животное оттуда)</label>
              <select value={intakeFacilityId} onChange={(e) => setIntakeFacilityId(e.target.value)} className="w-full rounded-lg border px-2 py-1">
                <option value="">Не из службы отлова</option>
                {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              {intakeFacilityId && (
                <label className="mt-2 block">Дата попадания
                  <input type="date" value={intakeDate} onChange={(e) => setIntakeDate(e.target.value)} className="ml-2 rounded-lg border px-2 py-1" />
                </label>
              )}
            </div>
          )}
        </section>
      )}

      {step === 4 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Проверьте и отправьте</h2>
          <p className="text-sm text-gray-600">{photos.length} фото · {draft.species} · {cities.find((c) => c.id === draft.city)?.nameRu}</p>
          {errors.auth && <p className="text-sm text-red-600">{errors.auth}</p>}
          {errors.org && <p className="text-sm text-red-600">{errors.org}</p>}
        </section>
      )}

      <div className="mt-6 flex justify-between">
        {step > 1 ? <button onClick={() => setStep((s) => s - 1)} className="rounded-lg border px-4 py-2">Назад</button> : <span />}
        {step < 4
          ? <button onClick={next} className="rounded-lg bg-blue-600 px-4 py-2 text-white">Далее</button>
          : <button onClick={submit} disabled={submitting} className="rounded-lg bg-green-600 px-4 py-2 text-white">{submitting ? 'Отправка…' : 'Отправить на проверку'}</button>}
      </div>
    </div>
  );
}
