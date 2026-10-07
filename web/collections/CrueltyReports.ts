import type { CollectionConfig } from 'payload';
import { isAdmin } from '../lib/auth/rbac.ts';

export const CrueltyReports: CollectionConfig = {
  slug: 'cruelty-reports',
  labels: { singular: 'Сообщение о жестокости', plural: 'Сообщения о жестокости' },
  admin: { useAsTitle: 'id', defaultColumns: ['locationCity', 'status', 'createdAt'] },
  access: {
    create: ({ req: { user } }) => isAdmin(user as any), // через /api/public/cruelty-reports (overrideAccess, в т.ч. анонимно)
    read: ({ req: { user } }) => isAdmin(user as any),
    update: ({ req: { user } }) => isAdmin(user as any),
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'description', type: 'textarea', required: true, maxLength: 5000 },
    { name: 'photos', type: 'upload', relationTo: 'media', hasMany: true },
    { name: 'contact', type: 'text', admin: { description: 'Опционально, для анонимных пусто' } },
    { name: 'reporterUser', type: 'relationship', relationTo: 'users', admin: { description: 'null для анонимных' } },
    { name: 'locationCity', type: 'relationship', relationTo: 'cities', index: true },
    {
      name: 'status', type: 'select', defaultValue: 'new', index: true, options: [
        { label: 'Новое', value: 'new' },
        { label: 'В работе', value: 'in_progress' },
        { label: 'Закрыто', value: 'closed' },
      ],
    },
  ],
};
