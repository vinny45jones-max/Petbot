import type { CollectionConfig } from 'payload';
import { isAdmin } from '../lib/auth/rbac.ts';
import { userAdministersOrg } from '../lib/auth/org-access.ts';
import { slugifyRu, uniqueSlug } from '../lib/slug.ts';

export const Organizations: CollectionConfig = {
  slug: 'organizations',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'city', 'isVerified', 'isPublished', 'updatedAt'],
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => isAdmin(user as any),
    update: async ({ req: { user, payload }, id }) =>
      isAdmin(user as any) || (id != null ? await userAdministersOrg(payload, user as any, id) : false),
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'name', type: 'text', required: true, index: true },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: { position: 'sidebar', description: 'Генерируется из названия, если пусто' },
    },
    { name: 'unp', type: 'text', admin: { description: 'УНП организации' } },
    { name: 'description', type: 'richText' },
    { name: 'logo', type: 'upload', relationTo: 'media' },
    { name: 'coverPhoto', type: 'upload', relationTo: 'media' },
    { name: 'city', type: 'relationship', relationTo: 'cities', index: true },
    { name: 'address', type: 'text' },
    { name: 'phone', type: 'text' },
    { name: 'email', type: 'email' },
    { name: 'tgUrl', type: 'text' },
    { name: 'viberUrl', type: 'text' },
    { name: 'vkUrl', type: 'text' },
    { name: 'instagramUrl', type: 'text' },
    { name: 'websiteUrl', type: 'text' },
    { name: 'donationBankDetails', type: 'richText' },
    { name: 'eripServiceCode', type: 'text' },
    { name: 'isVerified', type: 'checkbox', defaultValue: false, access: { update: ({ req: { user } }) => isAdmin(user as any) } },
    { name: 'isPublished', type: 'checkbox', defaultValue: false },
    {
      name: 'admins',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      admin: { description: 'Пользователи-администраторы этой организации' },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, req, operation, originalDoc }) => {
        if (!data) return data;
        if (!data.slug && data.name) {
          const base = slugifyRu(data.name) || 'org';
          data.slug = await uniqueSlug(base, async (candidate) => {
            const existing = await req.payload.find({
              collection: 'organizations',
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
