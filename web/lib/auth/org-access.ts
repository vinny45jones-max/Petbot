import type { Payload } from 'payload';
import type { User } from '@/payload-types';

type Actor = Pick<User, 'id' | 'role'> | null | undefined;

/**
 * Авторитетная проверка: управляет ли пользователь организацией orgId.
 *
 * Запрашивает owning-сторону связи — `Organizations.admins`, а не join-поле
 * `User.organizations`: join не популируется ни `payload.auth()`, ни `req.user`
 * в access-функциях, поэтому чтение `user.organizations` дало бы ложный `false`.
 */
export async function userAdministersOrg(
  payload: Payload,
  user: Actor,
  orgId: string | number,
): Promise<boolean> {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  if (user.role !== 'org_admin') return false;
  const { totalDocs } = await payload.find({
    collection: 'organizations',
    depth: 0,
    limit: 1,
    where: { and: [{ id: { equals: orgId } }, { admins: { in: [user.id] } }] },
  });
  return totalDocs > 0;
}
