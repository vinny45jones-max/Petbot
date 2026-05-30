'use client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface CityOption { slug: string; nameRu: string }

const SPECIES = [{ v: 'dog', l: 'Собаки' }, { v: 'cat', l: 'Кошки' }, { v: 'other', l: 'Другие' }];
const SIZES = [{ v: 'small', l: 'Маленький' }, { v: 'medium', l: 'Средний' }, { v: 'large', l: 'Большой' }];
const SEX = [{ v: 'male', l: 'Мальчик' }, { v: 'female', l: 'Девочка' }];

export function FilterPanel({ cities }: { cities: CityOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function update(mutate: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(sp.toString());
    mutate(next);
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`);
  }

  const setSingle = (key: string, value: string) =>
    update((n) => (n.get(key) === value ? n.delete(key) : n.set(key, value)));

  const toggleMulti = (key: string, value: string) =>
    update((n) => {
      const cur = n.getAll(key);
      n.delete(key);
      (cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value]).forEach((x) => n.append(key, x));
    });

  const toggleFlag = (key: string) =>
    update((n) => (n.get(key) === '1' ? n.delete(key) : n.set(key, '1')));

  return (
    <aside className="space-y-6">
      <fieldset>
        <legend className="mb-2 font-semibold">Вид</legend>
        {SPECIES.map((s) => (
          <label key={s.v} className="mr-3 inline-flex items-center gap-1">
            <input type="radio" name="species" checked={sp.get('species') === s.v} onChange={() => setSingle('species', s.v)} />
            {s.l}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-semibold">Размер</legend>
        {SIZES.map((s) => (
          <label key={s.v} className="mr-3 inline-flex items-center gap-1">
            <input type="checkbox" checked={sp.getAll('size').includes(s.v)} onChange={() => toggleMulti('size', s.v)} />
            {s.l}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-semibold">Пол</legend>
        <select
          value={sp.get('sex') ?? ''}
          onChange={(e) => update((n) => { n.delete('sex'); if (e.target.value) n.set('sex', e.target.value); })}
          className="w-full rounded-lg border px-2 py-1"
        >
          <option value="">Любой</option>
          {SEX.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-semibold">Город</legend>
        {/* multi-select: модель ждёт `cities[] in`, поэтому город — повторяющийся параметр `city` */}
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {cities.map((c) => (
            <label key={c.slug} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={sp.getAll('city').includes(c.slug)}
                onChange={() => toggleMulti('city', c.slug)}
              />
              {c.nameRu}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={sp.get('sterilized') === '1'} onChange={() => toggleFlag('sterilized')} />
        Стерилизован
      </label>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={sp.get('urgent') === '1'} onChange={() => toggleFlag('urgent')} />
        Только срочные
      </label>
    </aside>
  );
}
