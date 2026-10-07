import type { CollectionConfig } from 'payload';
import { isAdmin } from '../lib/auth/rbac.ts';

export const Comments: CollectionConfig = {
  slug: 'comments',
  labels: { singular: 'Комментарий', plural: 'Комментарии' },
  admin: { useAsTitle: 'id', defaultColumns: ['author', 'targetType', 'targetId', 'status', 'createdAt'] },
  access: {
    // создаётся через /api/public/comments (overrideAccess); прямой публичный create запрещён
    create: ({ req: { user } }) => isAdmin(user as any),
    // публично видны только published; модераторам — всё, иначе hidden/reported не промодерировать
    read: ({ req: { user } }) => (isAdmin(user as any) ? true : { status: { equals: 'published' } }),
    update: ({ req: { user } }) => isAdmin(user as any),
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'author', type: 'relationship', relationTo: 'users', required: true, index: true },
    {
      name: 'targetType', type: 'select', required: true, index: true, options: [
        { label: 'Животное', value: 'animal' },
        { label: 'Пост блога', value: 'blog_post' },
      ],
    },
    { name: 'targetId', type: 'text', required: true, index: true },
    { name: 'body', type: 'textarea', required: true, maxLength: 2000 },
    { name: 'parent', type: 'relationship', relationTo: 'comments' },
    {
      name: 'status', type: 'select', defaultValue: 'published', index: true, options: [
        { label: 'Опубликован', value: 'published' },
        { label: 'Скрыт (shadow-ban)', value: 'hidden' },
        { label: 'На жалобе', value: 'reported' },
      ],
    },
    { name: 'spamScore', type: 'number', defaultValue: 0, admin: { readOnly: true, position: 'sidebar' } },
  ],
};
