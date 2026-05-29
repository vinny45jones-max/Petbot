import type { CollectionConfig } from 'payload';

export const MagicLinkTokens: CollectionConfig = {
  slug: 'magic-link-tokens',
  admin: { hidden: true },
  access: { read: () => false, create: () => false, update: () => false, delete: () => false },
  fields: [
    { name: 'tokenHash', type: 'text', required: true, unique: true, index: true },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true },
    { name: 'consumedAt', type: 'date' },
  ],
  timestamps: true,
};
