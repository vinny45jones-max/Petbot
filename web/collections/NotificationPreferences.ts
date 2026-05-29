import type { CollectionConfig } from 'payload';
import { isAdmin } from '../lib/auth/rbac.ts';

export const NotificationPreferences: CollectionConfig = {
  slug: 'notification-preferences',
  admin: { useAsTitle: 'id' },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (isAdmin(user as any)) return true;
      return { user: { equals: user.id } };
    },
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => {
      if (!user) return false;
      if (isAdmin(user as any)) return true;
      return { user: { equals: user.id } };
    },
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, unique: true },
    { name: 'emailAdoptionInquiry', type: 'checkbox', defaultValue: true },
    { name: 'emailModerationResult', type: 'checkbox', defaultValue: true },
    { name: 'emailDonationReceipt', type: 'checkbox', defaultValue: true },
    { name: 'emailUrgentInCities', type: 'relationship', relationTo: 'cities', hasMany: true, admin: { description: 'Города, по которым приходят алерты о срочных животных' } },
    { name: 'emailWeeklyDigest', type: 'checkbox', defaultValue: false },
  ],
  timestamps: true,
};
