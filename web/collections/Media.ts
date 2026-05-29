import type { CollectionConfig } from 'payload';
import { isAdmin } from '../lib/auth/rbac.ts';

export const Media: CollectionConfig = {
  slug: 'media',
  admin: { useAsTitle: 'filename' },
  access: {
    read: () => true,
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => isAdmin(user as any) || !!user,
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  upload: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    imageSizes: [
      { name: 'thumb', width: 200, height: 200, fit: 'cover' },
      { name: 'card', width: 400 },
      { name: 'detail', width: 1600 },
    ],
    focalPoint: true,
    crop: false,
    adminThumbnail: 'thumb',
  },
  fields: [
    { name: 'alt', type: 'text', required: true },
    { name: 'mediaKind', type: 'select', required: true, defaultValue: 'image', options: [
      { label: 'Изображение', value: 'image' },
      { label: 'Видео', value: 'video' },
    ]},
    { name: 'uploadedBy', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
  ],
  hooks: {
    beforeChange: [
      ({ req, operation, data }) => {
        if (operation === 'create' && req.user) {
          data.uploadedBy = req.user.id;
        }
        return data;
      },
    ],
  },
};
