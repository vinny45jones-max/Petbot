import type { CollectionConfig } from 'payload';
import { isAdmin } from '../lib/auth/rbac.ts';

export const HelpArticles: CollectionConfig = {
  slug: 'help-articles',
  labels: { singular: 'Статья справки', plural: 'Справочный центр' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'category', 'order'] },
  access: {
    read: () => true,
    create: ({ req: { user } }) => isAdmin(user as any),
    update: ({ req: { user } }) => isAdmin(user as any),
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    {
      name: 'category', type: 'select', required: true, defaultValue: 'faq', index: true, options: [
        { label: 'FAQ', value: 'faq' },
        { label: 'Как это работает', value: 'how_it_works' },
        { label: 'Безопасность', value: 'safety' },
        { label: 'Справка', value: 'guide' },
      ],
    },
    { name: 'body', type: 'richText' },
    { name: 'order', type: 'number', defaultValue: 0, admin: { position: 'sidebar', description: 'Порядок вывода' } },
  ],
};
