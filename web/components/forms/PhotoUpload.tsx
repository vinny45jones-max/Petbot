'use client';
import { useState } from 'react';
import { resizeImageFile } from '@/lib/image-resize';
import { uploadPhoto } from '@/actions/animal';

export interface UploadedPhoto { id: string; previewUrl: string }

export function PhotoUpload({ value, onChange, max = 6 }: { value: UploadedPhoto[]; onChange: (p: UploadedPhoto[]) => void; max?: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    setError(null);
    setBusy(true);
    const next = [...value];
    for (const file of Array.from(files).slice(0, max - value.length)) {
      try {
        const resized = await resizeImageFile(file);
        const fd = new FormData();
        fd.append('file', resized);
        fd.append('alt', 'Фото животного');
        const res = await uploadPhoto(fd);
        if (res.ok && res.id) next.push({ id: res.id, previewUrl: URL.createObjectURL(resized) });
        else setError('Не удалось загрузить фото');
      } catch {
        setError('Ошибка обработки фото');
      }
    }
    onChange(next);
    setBusy(false);
  }

  return (
    <div>
      <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-gray-300 p-6 text-center hover:border-blue-400">
        <input type="file" accept="image/*" multiple className="hidden" disabled={busy || value.length >= max} onChange={(e) => handleFiles(e.target.files)} />
        {busy ? 'Загрузка…' : `Перетащите или выберите фото (до ${max})`}
      </label>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {value.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {value.map((p, i) => (
            <div key={p.id} className="relative h-20 w-20 overflow-hidden rounded-lg border">
              <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="absolute right-0 top-0 bg-black/60 px-1 text-xs text-white" aria-label="Удалить фото">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
