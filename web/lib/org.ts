import { getPayload } from 'payload';
import config from '@/payload.config';
import type { Organization } from '@/payload-types';

export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
  const payload = await getPayload({ config });
  const res = await payload.find({ collection: 'organizations', where: { slug: { equals: slug } }, limit: 1, depth: 1, overrideAccess: true });
  return (res.docs[0] as Organization) ?? null;
}
