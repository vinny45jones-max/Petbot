'use server';

import { getPayload } from 'payload';
import config from '@/payload.config';
import { getCurrentUser } from '@/lib/auth/current-user';
import { isAdmin } from '@/lib/auth/rbac';
import { userAdministersOrg } from '@/lib/auth/org-access';

export async function updateInquiryStatus(inquiryId: string, status: 'new' | 'contacted' | 'closed'): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  const payload = await getPayload({ config });

  // проверяем, что заявка относится к животному пользователя/его организации
  const inquiry: any = await payload.findByID({ collection: 'adoption-inquiries', id: inquiryId, depth: 2, overrideAccess: true }).catch(() => null);
  if (!inquiry) return { ok: false };
  const animal = inquiry.animal;
  const ownerId = animal && typeof animal === 'object' ? (typeof animal.ownerUser === 'object' ? animal.ownerUser?.id : animal.ownerUser) : null;
  const orgId = animal && typeof animal === 'object' ? (typeof animal.organization === 'object' ? animal.organization?.id : animal.organization) : null;

  let allowed = isAdmin(user as any) || (!!ownerId && String(ownerId) === String(user.id));
  if (!allowed && orgId) allowed = await userAdministersOrg(payload, user, orgId);
  if (!allowed) return { ok: false };

  await payload.update({ collection: 'adoption-inquiries', id: inquiryId, data: { status }, overrideAccess: true });
  return { ok: true };
}
