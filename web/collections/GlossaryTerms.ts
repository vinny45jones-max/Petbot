import type { CollectionConfig } from 'payload';
import { isAdmin } from '../lib/auth/rbac.ts';

export const GlossaryTerms: CollectionConfig = {
  slug: 'glossary-terms',
  labels: { singular: 'Термин', plural: 'Глоссарий' },
  admin: { useAsTitle: 'term', defaultColumns: ['term', 'slug'] },
  access: {
    read: () => true,
    create: ({ req: { user } }) => isAdmin(user as any),
    update: ({ req: { user } }) => isAdmin(user as any),
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'term', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'definition', type: 'textarea', required: true },
  ],
};
