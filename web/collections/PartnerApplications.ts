import type { CollectionConfig } from 'payload';
import { isAdmin } from '../lib/auth/rbac.ts';

export const PartnerApplications: CollectionConfig = {
  slug: 'partner-applications',
  labels: { singular: 'Заявка приюта', plural: 'Заявки приютов' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'unp', 'status', 'createdAt'] },
  access: {
    create: ({ req: { user } }) => isAdmin(user as any), // через /api/public/partner-applications (overrideAccess)
    read: ({ req: { user } }) => isAdmin(user as any),
    update: ({ req: { user } }) => isAdmin(user as any),
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'unp', type: 'text', admin: { description: '9 цифр' } },
    { name: 'contact', type: 'text', required: true, admin: { description: 'Телефон/email/TG' } },
    { name: 'links', type: 'textarea', admin: { description: 'Ссылки на соцсети/сайт' } },
    { name: 'message', type: 'textarea' },
    {
      name: 'status', type: 'select', defaultValue: 'new', index: true, options: [
        { label: 'Новая', value: 'new' },
        { label: 'Проверяется', value: 'in_review' },
        { label: 'Подключён', value: 'approved' },
        { label: 'Отклонён', value: 'rejected' },
      ],
    },
  ],
};
