import type { CollectionConfig } from 'payload';
import { isAdmin } from '../lib/auth/rbac.ts';

export const Cities: CollectionConfig = {
  slug: 'cities',
  admin: { useAsTitle: 'nameRu', defaultColumns: ['nameRu', 'region', 'updatedAt'] },
  access: {
    read: () => true,
    create: ({ req: { user } }) => isAdmin(user as any),
    update: ({ req: { user } }) => isAdmin(user as any),
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'nameRu', type: 'text', required: true, index: true },
    { name: 'nameBe', type: 'text', required: true },
    {
      name: 'region',
      type: 'select',
      required: true,
      options: [
        { label: 'Минская', value: 'Минская' },
        { label: 'Брестская', value: 'Брестская' },
        { label: 'Витебская', value: 'Витебская' },
        { label: 'Гомельская', value: 'Гомельская' },
        { label: 'Гродненская', value: 'Гродненская' },
        { label: 'Могилёвская', value: 'Могилёвская' },
      ],
    },
    { name: 'slug', type: 'text', unique: true, required: true, index: true },
  ],
};
