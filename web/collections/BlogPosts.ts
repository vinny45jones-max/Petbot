import type { CollectionConfig } from 'payload';
import { isAdmin } from '../lib/auth/rbac.ts';
import { slugifyRu, uniqueSlug } from '../lib/slug.ts';

export const BlogPosts: CollectionConfig = {
  slug: 'blog-posts',
  labels: { singular: 'Пост блога', plural: 'Блог' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'category', 'status', 'publishedAt'] },
  access: {
    read: ({ req: { user } }) => {
      if (isAdmin(user as any)) return true;
      return { status: { equals: 'published' } };
    },
    create: ({ req: { user } }) => isAdmin(user as any),
    update: ({ req: { user } }) => isAdmin(user as any),
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true, admin: { readOnly: true, position: 'sidebar' } },
    {
      name: 'category', type: 'select', defaultValue: 'news', index: true, options: [
        { label: 'Новости', value: 'news' },
        { label: 'Советы', value: 'tips' },
        { label: 'История успеха', value: 'success_story' },
      ],
    },
    { name: 'excerpt', type: 'textarea', maxLength: 300 },
    { name: 'coverPhoto', type: 'upload', relationTo: 'media' },
    { name: 'body', type: 'richText' },
    { name: 'author', type: 'relationship', relationTo: 'users', admin: { position: 'sidebar' } },
    { name: 'tags', type: 'text', hasMany: true },
    {
      name: 'status', type: 'select', defaultValue: 'draft', index: true, options: [
        { label: 'Черновик', value: 'draft' },
        { label: 'Опубликован', value: 'published' },
      ],
    },
    { name: 'publishedAt', type: 'date', index: true, admin: { position: 'sidebar' } },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation, originalDoc }) => {
        if (data && !data.slug && data.title) {
          const base = slugifyRu(data.title) || 'post';
          data.slug = await uniqueSlug(base, async (s) => {
            const r = await req.payload.find({ collection: 'blog-posts', where: { slug: { equals: s } }, limit: 1, depth: 0 });
            const hit = r.docs[0];
            return !!hit && (operation === 'create' || hit.id !== originalDoc?.id);
          });
        }
        if (data && data.status === 'published' && !data.publishedAt) {
          data.publishedAt = new Date().toISOString();
        }
        return data;
      },
    ],
  },
};
