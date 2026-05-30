import type { CollectionConfig } from 'payload';
import { isAdmin } from '../lib/auth/rbac.ts';
import { slugifyRu, uniqueSlug } from '../lib/slug.ts';

export const IntakeFacilities: CollectionConfig = {
  slug: 'intakeFacilities',
  labels: { singular: 'Служба отлова', plural: 'Службы отлова' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'city', 'legalHoldDays', 'isMunicipal', 'isPublished'],
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => isAdmin(user as any),
    update: ({ req: { user } }) => isAdmin(user as any),
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'name', type: 'text', required: true, index: true },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    { name: 'city', type: 'relationship', relationTo: 'cities', index: true },
    { name: 'address', type: 'text' },
    { name: 'phone', type: 'text' },
    { name: 'email', type: 'email' },
    {
      name: 'legalHoldDays',
      type: 'number',
      required: true,
      defaultValue: 5,
      min: 1,
      admin: { description: 'Дней содержания по закону до возможной эвтаназии (хранится в БД, правит модератор)' },
    },
    { name: 'description', type: 'richText' },
    { name: 'contactTgUrl', type: 'text' },
    { name: 'viberUrl', type: 'text' },
    {
      name: 'isMunicipal',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Муниципальная служба (а не частный приют)' },
    },
    { name: 'isPublished', type: 'checkbox', defaultValue: false },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, req, operation, originalDoc }) => {
        if (!data) return data;
        if (!data.slug && data.name) {
          const base = slugifyRu(data.name) || 'facility';
          data.slug = await uniqueSlug(base, async (candidate) => {
            const existing = await req.payload.find({
              collection: 'intakeFacilities',
              where: { slug: { equals: candidate } },
              limit: 1,
              depth: 0,
            });
            const hit = existing.docs[0];
            return !!hit && (operation === 'create' || hit.id !== originalDoc?.id);
          });
        }
        return data;
      },
    ],
  },
};
