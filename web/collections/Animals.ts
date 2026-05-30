import type { CollectionConfig } from 'payload';
import { isAdmin, canManageOrganization } from '../lib/auth/rbac.ts';
import { nextPetNumber } from '../lib/pet-number.ts';
import { makeAnimalBeforeChangeHook, makeAnimalLifecycleStamps } from '../lib/animal-hooks.ts';

export const Animals: CollectionConfig = {
  slug: 'animals',
  labels: { singular: 'Животное', plural: 'Животные' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['petNumber', 'name', 'species', 'status', 'urgencyLevel', 'city', 'updatedAt'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (isAdmin(user as any)) return true;
      return { status: { equals: 'published' } };
    },
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user }, data }) => {
      if (isAdmin(user as any)) return true;
      if (!user) return false;
      const orgId = data?.organization ? String(data.organization) : null;
      if (orgId && canManageOrganization(user as any, orgId)) return true;
      return { ownerUser: { equals: user.id } };
    },
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'name', type: 'text', index: true, admin: { description: 'Кличка (может быть пустой)' } },
    { name: 'petNumber', type: 'number', unique: true, index: true, admin: { readOnly: true, position: 'sidebar' } },
    { name: 'slug', type: 'text', unique: true, index: true, admin: { readOnly: true, position: 'sidebar' } },
    {
      name: 'species', type: 'select', required: true, index: true, options: [
        { label: 'Собака', value: 'dog' },
        { label: 'Кошка', value: 'cat' },
        { label: 'Другое', value: 'other' },
      ],
    },
    {
      name: 'sex', type: 'select', defaultValue: 'unknown', options: [
        { label: 'Мальчик', value: 'male' },
        { label: 'Девочка', value: 'female' },
        { label: 'Неизвестно', value: 'unknown' },
      ],
    },
    { name: 'ageYears', type: 'number', min: 0, max: 40 },
    { name: 'ageMonths', type: 'number', min: 0, max: 11 },
    {
      name: 'size', type: 'select', options: [
        { label: 'Маленький', value: 'small' },
        { label: 'Средний', value: 'medium' },
        { label: 'Большой', value: 'large' },
      ],
    },
    { name: 'description', type: 'richText' },
    { name: 'descriptionPlain', type: 'textarea', admin: { hidden: true } }, // заполняется хуком (Task 7) для FTS
    {
      name: 'healthStatus', type: 'select', defaultValue: 'healthy', options: [
        { label: 'Здоров', value: 'healthy' },
        { label: 'Нужно лечение', value: 'needs_treatment' },
        { label: 'Хроническое состояние', value: 'chronic_condition' },
        { label: 'Восстанавливается', value: 'recovering' },
        { label: 'Неизвестно', value: 'unknown' },
      ],
    },
    { name: 'healthNotes', type: 'richText' },
    { name: 'isSterilized', type: 'checkbox', defaultValue: false },
    { name: 'isVaccinated', type: 'checkbox', defaultValue: false },
    { name: 'microchipId', type: 'text', admin: { description: '15 цифр (опционально)' } },
    { name: 'city', type: 'relationship', relationTo: 'cities', index: true },
    {
      name: 'ownerType', type: 'select', required: true, defaultValue: 'citizen', index: true, options: [
        { label: 'Гражданин', value: 'citizen' },
        { label: 'Организация', value: 'organization' },
      ],
    },
    { name: 'ownerUser', type: 'relationship', relationTo: 'users', index: true },
    { name: 'organization', type: 'relationship', relationTo: 'organizations', index: true },
    {
      name: 'status', type: 'select', required: true, defaultValue: 'pending_review', index: true, options: [
        { label: 'На проверке', value: 'pending_review' },
        { label: 'Опубликовано', value: 'published' },
        { label: 'Пристроено', value: 'adopted' },
        { label: 'В архиве', value: 'archived' },
      ],
    },
    {
      name: 'source', type: 'select', defaultValue: 'web_form', admin: { position: 'sidebar' }, options: [
        { label: 'Веб-форма', value: 'web_form' },
        { label: 'Telegram-бот', value: 'telegram_bot' },
        { label: 'Партнёрский фид', value: 'partner_feed' },
        { label: 'Админ', value: 'admin' },
      ],
    },
    {
      name: 'lostOrFound', type: 'select', defaultValue: 'none', index: true, options: [
        { label: 'Не потеряшка', value: 'none' },
        { label: 'Потерян', value: 'lost' },
        { label: 'Найден', value: 'found' },
      ],
    },
    { name: 'media', type: 'upload', relationTo: 'media', hasMany: true, admin: { description: 'Фото (в MVP), видео — фаза 2' } },
    // --- критическая вертикаль §17 ---
    { name: 'intakeFacility', type: 'relationship', relationTo: 'intakeFacilities', index: true, admin: { position: 'sidebar' } },
    { name: 'intakeDate', type: 'date', admin: { position: 'sidebar', description: 'Дата попадания в службу отлова' } },
    { name: 'legalDeadlineDate', type: 'date', index: true, admin: { position: 'sidebar', description: 'Дедлайн; авто из службы, можно override' } },
    {
      name: 'urgencyLevel', type: 'select', defaultValue: 'normal', index: true, admin: { position: 'sidebar', readOnly: true }, options: [
        { label: 'Обычная', value: 'normal' },
        { label: 'Высокая', value: 'high' },
        { label: 'Критическая', value: 'critical' },
      ],
    },
    { name: 'urgencyRank', type: 'number', defaultValue: 0, index: true, admin: { hidden: true } },
    { name: 'publishedAt', type: 'date', admin: { position: 'sidebar', readOnly: true } },
    { name: 'adoptedAt', type: 'date', admin: { position: 'sidebar', readOnly: true } },
  ],
  hooks: {
    beforeChange: [
      async (args) => {
        const { req } = args;
        // боевой хук с реальными зависимостями (DI-ядро протестировано отдельно)
        const hook = makeAnimalBeforeChangeHook({
          nextPetNumber: () => nextPetNumber(req.payload),
          getFacilityHoldDays: async (facilityId: string) => {
            const fac = await req.payload.findByID({ collection: 'intakeFacilities', id: facilityId, depth: 0 });
            return (fac as any)?.legalHoldDays ?? 5;
          },
          now: () => new Date(),
        });
        return hook(args);
      },
    ],
    beforeValidate: [
      // publishedAt/adoptedAt при ЛЮБОЙ операции (см. makeAnimalLifecycleStamps)
      makeAnimalLifecycleStamps(),
    ],
  },
};
