import type { CollectionConfig } from 'payload';
import { isAdmin } from '../lib/auth/rbac.ts';

export const AdoptionInquiries: CollectionConfig = {
  slug: 'adoption-inquiries',
  labels: { singular: 'Заявка на усыновление', plural: 'Заявки на усыновление' },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['animal', 'applicant', 'status', 'createdAt'],
  },
  access: {
    // создаётся через server-side API (overrideAccess), create=true только для залогиненных
    create: ({ req: { user } }) => !!user,
    read: ({ req: { user } }) => {
      if (isAdmin(user as any)) return true;
      if (!user) return false;
      return { applicant: { equals: user.id } };
    },
    update: ({ req: { user } }) => isAdmin(user as any),
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'animal', type: 'relationship', relationTo: 'animals', required: true, index: true },
    { name: 'applicant', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'message', type: 'textarea', required: true, maxLength: 2000 },
    { name: 'contactPhone', type: 'text' },
    { name: 'contactTelegram', type: 'text' },
    {
      name: 'status', type: 'select', defaultValue: 'new', index: true, options: [
        { label: 'Новая', value: 'new' },
        { label: 'На связи', value: 'contacted' },
        { label: 'Закрыта', value: 'closed' },
      ],
    },
  ],
};
