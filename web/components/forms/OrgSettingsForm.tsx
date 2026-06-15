'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrganizationProfile, type OrgProfileInput } from '@/actions/organization';

const FIELDS: { key: keyof OrgProfileInput; label: string; type?: string }[] = [
  { key: 'phone', label: 'Телефон' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'address', label: 'Адрес' },
  { key: 'websiteUrl', label: 'Сайт' },
  { key: 'tgUrl', label: 'Telegram' },
  { key: 'viberUrl', label: 'Viber' },
  { key: 'instagramUrl', label: 'Instagram' },
];

export function OrgSettingsForm({ orgId, initial }: { orgId: string; initial: OrgProfileInput }) {
  const router = useRouter();
  const [form, setForm] = useState<OrgProfileInput>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    const r = await updateOrganizationProfile(orgId, form);
    setSaving(false);
    if (r.ok) { setSaved(true); router.refresh(); }
  }

  return (
    <div className="max-w-xl space-y-3">
      <label className="block">
        <span className="font-medium">Описание</span>
        <textarea value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="w-full rounded-lg border px-2 py-1" />
      </label>
      {FIELDS.map((f) => (
        <label key={f.key} className="block">
          <span className="font-medium">{f.label}</span>
          <input type={f.type ?? 'text'} value={(form[f.key] as string) ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="w-full rounded-lg border px-2 py-1" />
        </label>
      ))}
      <button onClick={save} disabled={saving} className="rounded-lg bg-green-600 px-4 py-2 text-white">{saving ? 'Сохранение…' : 'Сохранить'}</button>
      {saved && <span className="ml-2 text-sm text-green-700">Сохранено</span>}
    </div>
  );
}
