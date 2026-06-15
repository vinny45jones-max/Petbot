'use server';

import { getPayload } from 'payload';
import config from '@/payload.config';
import { getCurrentUser } from '@/lib/auth/current-user';
import { isAdmin } from '@/lib/auth/rbac';
import { userAdministersOrg } from '@/lib/auth/org-access';

export interface OrgProfileInput {
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  tgUrl?: string;
  viberUrl?: string;
  instagramUrl?: string;
}

const EDITABLE: (keyof OrgProfileInput)[] = ['description', 'address', 'phone', 'email', 'websiteUrl', 'tgUrl', 'viberUrl', 'instagramUrl'];

export async function updateOrganizationProfile(orgId: string, input: OrgProfileInput): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  const payload = await getPayload({ config });
  if (!isAdmin(user as any) && !(await userAdministersOrg(payload, user, orgId))) return { ok: false };

  const data: Record<string, any> = {};
  for (const key of EDITABLE) {
    if (input[key] !== undefined) {
      data[key] = key === 'description'
        ? { root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: input.description ?? '' }] }] } }
        : input[key];
    }
  }
  await payload.update({ collection: 'organizations', id: orgId, data, overrideAccess: true });
  return { ok: true };
}
