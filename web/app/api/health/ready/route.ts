import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import { sql } from '@payloadcms/db-postgres';
import config from '@payload-config';
import { migrations } from '@/migrations';
import { pendingMigrations } from '@/lib/readiness';

export const dynamic = 'force-dynamic';

// Railway healthcheck: БД доступна и схема на версии кода. В dev схему ведёт push — сверку миграций пропускаем.
export async function GET() {
  try {
    const payload = await getPayload({ config });
    const db = (payload.db as any).drizzle;
    const res = await db.execute(sql`select name from payload_migrations`);
    if (process.env.NODE_ENV === 'production') {
      const pending = pendingMigrations(migrations.map((m) => m.name), res.rows.map((r: any) => r.name));
      if (pending.length) return NextResponse.json({ status: 'error', pending }, { status: 503 });
    }
    return NextResponse.json({ status: 'ok' });
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 503 });
  }
}
