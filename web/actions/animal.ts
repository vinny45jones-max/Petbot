'use server';

import { getPayload, type Payload } from 'payload';
import config from '@/payload.config';
import { getCurrentUser } from '@/lib/auth/current-user';
import { isAdmin } from '@/lib/auth/rbac';
import { userAdministersOrg } from '@/lib/auth/org-access';
import { recordAuditLog } from '@/lib/audit/log';
import { validateAnimalDraft, type AnimalDraft } from '@/lib/animal-form';
import { notifyNewAnimal } from '@/lib/notify/dispatch';
import type { User } from '@/payload-types';

export interface CreateAnimalInput extends AnimalDraft {
  mediaIds: string[];
  organizationId?: string;   // при создании от лица организации
  intakeFacilityId?: string; // только для org_admin (модель А, §17.7)
  intakeDate?: string;
}

export type ActionResult = { ok: true; id: string } | { ok: false; errors: Record<string, string> };

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 МБ

/** Загружает одно фото в Media через Local API, возвращает id. */
export async function uploadPhoto(formData: FormData): Promise<{ ok: boolean; id?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'unauthorized' };
  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, error: 'no file' };

  // Серверная валидация ДО создания Media (клиентский resize не доверяем).
  if (!ALLOWED_MIME.has(file.type)) {
    return { ok: false, error: 'Допустимы только JPEG, PNG или WebP' };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: 'Файл больше 8 МБ' };
  }

  const payload = await getPayload({ config });
  const buffer = Buffer.from(await file.arrayBuffer());
  const created = await payload.create({
    collection: 'media',
    data: { alt: (formData.get('alt') as string) || 'Фото животного' },
    file: { data: buffer, mimetype: file.type, name: file.name, size: file.size },
  } as any);
  return { ok: true, id: String(created.id) };
}

// Зависимость Plan 4: rate-limit на размещение (защита от спам-загрузок) —
// lib/security/rate-limit + Turnstile из Plan 4. Здесь только MIME/размер;
// частотный лимит и капча навешиваются поверх uploadPhoto/createAnimal в Plan 4.

async function resolveOwnership(payload: Payload, user: User, input: CreateAnimalInput) {
  if (input.organizationId) {
    if (!isAdmin(user) && !(await userAdministersOrg(payload, user, input.organizationId))) {
      return { error: 'forbidden' as const };
    }
    return { ownerType: 'organization' as const, organization: input.organizationId, ownerUser: undefined };
  }
  return { ownerType: 'citizen' as const, ownerUser: user.id, organization: undefined };
}

export async function createAnimal(input: CreateAnimalInput): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, errors: { auth: 'Требуется вход' } };

  const draft: AnimalDraft = { ...input, photoCount: input.mediaIds.length };
  const validation = validateAnimalDraft(draft);
  if (!validation.ok) return { ok: false, errors: validation.errors };

  const payload = await getPayload({ config });

  const ownership = await resolveOwnership(payload, user, input);
  if ('error' in ownership) return { ok: false, errors: { org: 'Нет прав на эту организацию' } };

  const created = await payload.create({
    collection: 'animals',
    data: {
      species: input.species, sex: input.sex ?? 'unknown', size: input.size,
      name: input.name, ageYears: input.ageYears, ageMonths: input.ageMonths,
      city: input.city, healthStatus: input.healthStatus ?? 'unknown',
      description: { root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: input.description ?? '' }] }] } },
      microchipId: input.microchipId || undefined,
      media: input.mediaIds,
      status: 'pending_review',
      source: 'web_form',
      ...ownership,
      // intakeFacility (служба отлова, §17.7 модель А) допустим только на org-объявлении,
      // владение которым уже подтверждено resolveOwnership.
      ...(input.intakeFacilityId && ownership.ownerType === 'organization'
        ? { intakeFacility: input.intakeFacilityId, intakeDate: input.intakeDate }
        : {}),
    } as any,
    overrideAccess: false,
    user,
  });

  await recordAuditLog(payload, { actorId: user.id, action: 'animal.created', targetType: 'animal', targetId: String(created.id) });

  // если у пользователя ещё нет контактов — сохранить введённые в профиль
  if (ownership.ownerType === 'citizen' && (!user.phone || !user.telegramUsername)) {
    await payload.update({
      collection: 'users', id: user.id,
      data: {
        phone: user.phone || input.contactPhone || undefined,
        telegramUsername: user.telegramUsername || (input.contactTelegram?.replace(/^@/, '')) || undefined,
      } as any,
      overrideAccess: true,
    });
  }

  const cityName = typeof created.city === 'object' && created.city ? (created.city as any).nameRu : undefined;
  await notifyNewAnimal({ id: created.id, petNumber: (created as any).petNumber, name: created.name, species: created.species as string, city: cityName });

  return { ok: true, id: String(created.id) };
}

export async function updateAnimal(id: string, input: Partial<CreateAnimalInput>): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, errors: { auth: 'Требуется вход' } };
  const payload = await getPayload({ config });

  // Загружаем существующее животное, чтобы знать тип владельца.
  // Animal access.update (Plan 2) отдаёт org-ветку только при наличии data.organization;
  // без него апдейт org-животного владельцем-организацией проваливается в ownerUser-фильтр.
  const existing: any = await payload.findByID({ collection: 'animals', id, depth: 0, overrideAccess: true }).catch(() => null);
  if (!existing) return { ok: false, errors: { auth: 'Объявление не найдено' } };

  const data: Record<string, any> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) {
    data.description = { root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: input.description }] }] } };
  }
  if (input.healthStatus) data.healthStatus = input.healthStatus;
  if (input.size) data.size = input.size;
  if (input.sex) data.sex = input.sex;
  if (input.ageYears !== undefined) data.ageYears = input.ageYears;
  if (input.ageMonths !== undefined) data.ageMonths = input.ageMonths;
  if (input.mediaIds) data.media = input.mediaIds;

  // Для org-животного подмешиваем organization (id) в data — иначе access.update вернёт ownerUser-фильтр.
  if (existing.ownerType === 'organization') {
    data.organization = typeof existing.organization === 'object' && existing.organization
      ? String(existing.organization.id)
      : String(existing.organization);
  }

  try {
    await payload.update({ collection: 'animals', id, data: data as any, overrideAccess: false, user });
  } catch {
    return { ok: false, errors: { auth: 'Нет прав на это объявление' } };
  }
  await recordAuditLog(payload, { actorId: user.id, action: 'animal.updated', targetType: 'animal', targetId: id });
  return { ok: true, id };
}

export async function deleteAnimal(id: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  const payload = await getPayload({ config });
  // мягкое закрытие: citizen-владелец архивирует, не удаляет физически
  try {
    await payload.update({ collection: 'animals', id, data: { status: 'archived' } as any, overrideAccess: false, user });
  } catch {
    return { ok: false };
  }
  await recordAuditLog(payload, { actorId: user.id, action: 'animal.archived', targetType: 'animal', targetId: id });
  return { ok: true };
}
