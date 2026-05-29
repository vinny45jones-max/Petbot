import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

export async function GET(req: NextRequest) {
  const payload = await getPayload({ config });
  const session = await payload.auth({ headers: req.headers });
  if (!session.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const userId = session.user.id;
  const user = await payload.findByID({ collection: 'users', id: userId });
  const notifPrefs = await payload.find({ collection: 'notification-preferences', where: { user: { equals: userId } } });
  const auditLogs = await payload.find({ collection: 'audit-logs', where: { actor: { equals: userId } }, limit: 1000 });
  const dump = {
    exported_at: new Date().toISOString(),
    user,
    notification_preferences: notifPrefs.docs,
    audit_logs: auditLogs.docs,
  };
  return new NextResponse(JSON.stringify(dump, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="pet-aggregator-export-${userId}.json"`,
    },
  });
}
