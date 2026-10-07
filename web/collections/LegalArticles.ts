import type { CollectionConfig } from 'payload';
import { isAdmin } from '../lib/auth/rbac.ts';

export const LegalArticles: CollectionConfig = {
  slug: 'legal-articles',
  labels: { singular: 'Юр.статья', plural: 'Юридический раздел' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'category', 'updatedAt'] },
  access: {
    read: () => true, // юр.раздел всегда публичен
    create: ({ req: { user } }) => isAdmin(user as any),
    update: ({ req: { user } }) => isAdmin(user as any),
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    {
      name: 'category', type: 'select', required: true, defaultValue: 'general', index: true, options: [
        { label: 'Общее', value: 'general' },
        { label: 'Жестокое обращение', value: 'cruelty' },
        { label: 'Потерянные питомцы', value: 'lost_pet' },
        { label: 'Права при усыновлении', value: 'adoption_rights' },
      ],
    },
    { name: 'excerpt', type: 'textarea', maxLength: 300 },
    { name: 'body', type: 'richText' },
    {
      name: 'npaLinks', type: 'array', labels: { singular: 'Ссылка на НПА', plural: 'Ссылки на НПА' }, fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
      ],
    },
  ],
};
