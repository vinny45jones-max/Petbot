import { NextResponse } from 'next/server';
import { aggregateHealth } from '@/lib/health';
import { checkHealth } from '@/lib/health-server';

export const dynamic = 'force-dynamic';

// Для внешнего мониторинга (UptimeRobot: keyword "status":"ok"). Railway healthcheck — /api/health/ready.
export async function GET() {
  const result = aggregateHealth(await checkHealth());
  return NextResponse.json({ ...result, timestamp: new Date().toISOString() }, { status: result.status === 'ok' ? 200 : 503 });
}
