import type { CollectionConfig } from 'payload';
import { isAdmin } from '../lib/auth/rbac.ts';
import { makeRegistrationGuard } from '../lib/auth/registration-guard.ts';
import { verifyTurnstile } from '../lib/security/turnstile.ts';
import { checkRateLimit } from '../lib/security/rate-limit.ts';
import { canAccessAdmin } from '../lib/auth/admin-access.ts';

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    tokenExpiration: 60 * 60 * 24 * 30,
    verify: true,
    cookies: { sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' },
  },
  admin: { useAsTitle: 'email', defaultColumns: ['email', 'firstName', 'role', 'createdAt'] },
  hooks: {
    // §16.2: 10 регистраций в час с одного IP + Turnstile
    beforeOperation: [
      makeRegistrationGuard({ verify: verifyTurnstile, allow: (key) => checkRateLimit(key, 10, 60 * 60 * 1000) }) as any,
    ],
    afterChange: [
      // Welcome-письмо. Без RESEND_API_KEY (dev, CI, сиды) — молча пропускаем; модули грузим лениво (tsx-шаблон).
      async ({ doc, operation }) => {
        if (operation !== 'create' || !process.env.RESEND_API_KEY) return;
        try {
          const { sendWelcomeOnCreate } = await import('../lib/email/welcome-hook.ts');
          const { sendEmail } = await import('../lib/email/resend-client.ts');
          await sendWelcomeOnCreate({ doc, operation }, sendEmail);
        } catch (e) {
          console.warn('[welcome-email] хук не отработал:', (e as Error).message);
        }
      },
    ],
  },
  access: {
    // §16.2: админка — только moderator/superadmin с пройденной 2FA (proxy.ts уводит на /2fa).
    admin: ({ req }) => canAccessAdmin(req.user as never, req.headers.get('cookie')),
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
      saveToJWT: true, // proxy.ts по роли решает, нужен ли 2FA-гейт
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
    // 2FA (§16.2): меняются только через /api/auth/2fa/* (overrideAccess), секрет и хеши кодов не отдаются наружу.
    {
      name: 'totpEnabled',
      type: 'checkbox',
      defaultValue: false,
      access: { create: () => false, update: () => false },
      admin: { readOnly: true, description: '2FA включена (TOTP)' },
    },
    { name: 'totpSecretEnc', type: 'text', hidden: true, access: { read: () => false, create: () => false, update: () => false } },
    { name: 'totpRecoveryHashes', type: 'json', hidden: true, access: { read: () => false, create: () => false, update: () => false } },
    {
      name: 'organizations',
      type: 'join',
      collection: 'organizations',
      on: 'admins',
      admin: { description: 'Организации, где пользователь — админ' },
    },
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
