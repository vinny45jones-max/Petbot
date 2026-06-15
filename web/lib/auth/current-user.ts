import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { userAdministersOrg } from '@/lib/auth/org-access';
import type { User } from '@/payload-types';

/** Текущий пользователь в RSC/server action, либо null. */
export async function getCurrentUser(): Promise<User | null> {
  const payload = await getPayload({ config });
  const h = await headers();
  const { user } = await payload.auth({ headers: h });
  return (user as User) ?? null;
}

/** Требует логин; иначе redirect на /login. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

/** Требует право управлять организацией orgId; иначе redirect. */
export async function requireOrgAdmin(orgId: string | number): Promise<User> {
  const user = await requireUser();
  const payload = await getPayload({ config });
  if (!(await userAdministersOrg(payload, user, orgId))) redirect('/');
  return user;
}
