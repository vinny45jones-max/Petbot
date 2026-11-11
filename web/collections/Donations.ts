import type { CollectionConfig } from 'payload';
import { isAdmin } from '../lib/auth/rbac.ts';

export const Donations: CollectionConfig = {
  slug: 'donations',
  labels: { singular: 'Пожертвование', plural: 'Пожертвования' },
  admin: { useAsTitle: 'id', defaultColumns: ['amountByn', 'targetType', 'status', 'createdAt'] },
  access: {
    // пишет только сервер (Local API, overrideAccess); агрегаты считаются через overrideAccess
    create: ({ req: { user } }) => isAdmin(user as any),
    read: ({ req: { user } }) => {
      if (isAdmin(user as any)) return true;
      if (!user) return false;
      return { donorUser: { equals: user.id } };
    },
    update: ({ req: { user } }) => isAdmin(user as any),
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'donorUser', type: 'relationship', relationTo: 'users', index: true, admin: { description: 'null для гостевых донатов' } },
    { name: 'donorEmail', type: 'text', index: true },
    { name: 'donorPhone', type: 'text' },
    { name: 'donorName', type: 'text' },
    { name: 'amountByn', type: 'number', required: true, min: 1 },
    { name: 'currency', type: 'text', defaultValue: 'BYN' },
    {
      name: 'targetType', type: 'select', required: true, index: true, options: [
        { label: 'Организация', value: 'organization' },
        { label: 'Животное', value: 'animal' },
        { label: 'Общий фонд', value: 'general_fund' },
      ],
    },
    { name: 'organization', type: 'relationship', relationTo: 'organizations', index: true },
    { name: 'animal', type: 'relationship', relationTo: 'animals', index: true },
    { name: 'purpose', type: 'text', admin: { description: 'Корм / лечение / общее' } },
    {
      name: 'paymentProvider', type: 'select', defaultValue: 'expresspay_erip', options: [
        { label: 'ExpressPay (ЕРИП)', value: 'expresspay_erip' },
        { label: 'Банковский перевод (вручную)', value: 'bank_transfer_manual' },
      ],
    },
    { name: 'providerInvoiceId', type: 'text', unique: true, index: true, admin: { description: 'Номер счёта ExpressPay (InvoiceNo / CardInvoiceNo)' } },
    { name: 'accountNo', type: 'text', unique: true, index: true, admin: { description: 'Наш номер заказа (AccountNo в ExpressPay) — по нему webhook находит донат' } },
    {
      name: 'status', type: 'select', required: true, defaultValue: 'pending', index: true, options: [
        { label: 'Ожидает оплаты', value: 'pending' },
        { label: 'Оплачено', value: 'paid' },
        { label: 'Не удалось', value: 'failed' },
        { label: 'Возврат', value: 'refunded' },
      ],
    },
    { name: 'paidAt', type: 'date', admin: { readOnly: true, position: 'sidebar' } },
  ],
};
