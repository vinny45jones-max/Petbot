import type { CollectionConfig } from 'payload';
import { isAdmin } from '../lib/auth/rbac.ts';

export const ReportFlags: CollectionConfig = {
  slug: 'report-flags',
  labels: { singular: 'Жалоба', plural: 'Жалобы' },
  admin: { useAsTitle: 'id', defaultColumns: ['reporter', 'targetType', 'targetId', 'status', 'createdAt'] },
  access: {
    create: ({ req: { user } }) => isAdmin(user as any), // через /api/public/reports (overrideAccess)
    read: ({ req: { user } }) => isAdmin(user as any),
    update: ({ req: { user } }) => isAdmin(user as any),
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'reporter', type: 'relationship', relationTo: 'users', index: true },
    {
      name: 'targetType', type: 'select', required: true, options: [
        { label: 'Животное', value: 'animal' },
        { label: 'Комментарий', value: 'comment' },
        { label: 'Организация', value: 'organization' },
      ],
    },
    { name: 'targetId', type: 'text', required: true, index: true },
    { name: 'reason', type: 'textarea', required: true, maxLength: 1000 },
    {
      name: 'status', type: 'select', defaultValue: 'new', index: true, options: [
        { label: 'Новая', value: 'new' },
        { label: 'В работе', value: 'in_progress' },
        { label: 'Закрыта', value: 'closed' },
      ],
    },
  ],
};
