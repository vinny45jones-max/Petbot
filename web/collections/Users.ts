import type { CollectionConfig } from 'payload';
import { isAdmin } from '../lib/auth/rbac.ts';

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    tokenExpiration: 60 * 60 * 24 * 30,
    verify: true,
    cookies: { sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' },
  },
  admin: { useAsTitle: 'email', defaultColumns: ['email', 'firstName', 'role', 'createdAt'] },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (isAdmin(user as any)) return true;
      return { id: { equals: user.id } };
    },
    update: ({ req: { user } }) => {
      if (!user) return false;
      if (isAdmin(user as any)) return true;
      return { id: { equals: user.id } };
    },
    delete: ({ req: { user } }) => isAdmin(user as any),
    create: () => true,
  },
  fields: [
    { name: 'firstName', type: 'text', required: false },
    { name: 'lastName', type: 'text', required: false },
    { name: 'photoUrl', type: 'text', required: false },
    { name: 'phone', type: 'text', required: false },
    { name: 'telegramId', type: 'text', unique: true, index: true, admin: { readOnly: true } },
    { name: 'telegramUsername', type: 'text' },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'citizen',
      options: [
        { label: 'Гость', value: 'guest' },
        { label: 'Гражданин', value: 'citizen' },
        { label: 'Админ организации', value: 'org_admin' },
        { label: 'Модератор', value: 'moderator' },
        { label: 'Суперадмин', value: 'superadmin' },
      ],
      access: {
        create: ({ req: { user } }) => user?.role === 'superadmin',
        update: ({ req: { user } }) => user?.role === 'superadmin',
      },
    },
    {
      name: 'isBlocked',
      type: 'checkbox',
      defaultValue: false,
      access: {
        create: ({ req: { user } }) => isAdmin(user as any),
        update: ({ req: { user } }) => isAdmin(user as any),
      },
    },
    { name: 'lastSeenAt', type: 'date', admin: { readOnly: true } },
    {
      name: 'ageConfirmed',
      type: 'checkbox',
      required: true,
      defaultValue: false,
      admin: { description: 'Подтверждено что 14+' },
    },
    {
      name: 'consentPersonalData',
      type: 'checkbox',
      required: true,
      defaultValue: false,
      admin: { description: 'Согласие 99-З' },
    },
  ],
};
