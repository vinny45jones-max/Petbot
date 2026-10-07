import { describe, it, expect } from 'vitest';
import { CrueltyReports } from '@/collections/CrueltyReports';
import { PartnerApplications } from '@/collections/PartnerApplications';

const ctx = (user: unknown) => ({ req: { user } }) as any;
const anon = ctx(null);
const citizen = ctx({ role: 'citizen' });
const orgAdmin = ctx({ role: 'org_admin' });
const moderator = ctx({ role: 'moderator' });

// Сообщения о жестокости и заявки приютов содержат контакты заявителей — только модерация.
describe.each([
  ['CrueltyReports', CrueltyReports],
  ['PartnerApplications', PartnerApplications],
])('%s — доступ', (_name, col) => {
  it('чтение только модераторам', () => {
    expect(col.access!.read!(anon)).toBe(false);
    expect(col.access!.read!(citizen)).toBe(false);
    expect(col.access!.read!(orgAdmin)).toBe(false);
    expect(col.access!.read!(moderator)).toBe(true);
  });
  it('прямой create закрыт (публичный — через API-роут с overrideAccess)', () => {
    expect(col.access!.create!(anon)).toBe(false);
    expect(col.access!.create!(citizen)).toBe(false);
  });
});
