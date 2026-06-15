import { describe, it, expect, vi } from 'vitest';
import { userAdministersOrg } from '@/lib/auth/org-access';

function makePayload(totalDocs: number) {
  const find = vi.fn().mockResolvedValue({ totalDocs });
  return { payload: { find } as any, find };
}

describe('userAdministersOrg', () => {
  it('returns false for null user without querying', async () => {
    const { payload, find } = makePayload(1);
    expect(await userAdministersOrg(payload, null, 1)).toBe(false);
    expect(find).not.toHaveBeenCalled();
  });

  it('superadmin manages any org without querying', async () => {
    const { payload, find } = makePayload(0);
    expect(await userAdministersOrg(payload, { id: 1, role: 'superadmin' } as any, 7)).toBe(true);
    expect(find).not.toHaveBeenCalled();
  });

  it('non-org role (citizen) denied without querying', async () => {
    const { payload, find } = makePayload(1);
    expect(await userAdministersOrg(payload, { id: 1, role: 'citizen' } as any, 7)).toBe(false);
    expect(find).not.toHaveBeenCalled();
  });

  it('org_admin allowed when membership query matches', async () => {
    const { payload, find } = makePayload(1);
    const ok = await userAdministersOrg(payload, { id: 5, role: 'org_admin' } as any, 7);
    expect(ok).toBe(true);
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'organizations',
        where: { and: [{ id: { equals: 7 } }, { admins: { in: [5] } }] },
      }),
    );
  });

  it('org_admin denied when membership query empty', async () => {
    const { payload, find } = makePayload(0);
    expect(await userAdministersOrg(payload, { id: 5, role: 'org_admin' } as any, 999)).toBe(false);
  });
});
