// Статус для /api/health и /status (§16.2). off — сервис не подключён (нет env), это не авария.
export type CheckState = 'ok' | 'error' | 'off';
export interface HealthChecks { db: CheckState; storage: CheckState }
type Probe = (() => Promise<void>) | null;

export function aggregateHealth(checks: HealthChecks): { status: 'ok' | 'degraded'; checks: HealthChecks } {
  return { status: Object.values(checks).includes('error') ? 'degraded' : 'ok', checks };
}

async function probe(fn: Probe, timeoutMs: number): Promise<CheckState> {
  if (!fn) return 'off';
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([fn(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), timeoutMs); })]);
    return 'ok';
  } catch {
    return 'error';
  } finally {
    clearTimeout(timer);
  }
}

export async function runHealthChecks(probes: { db: Probe; storage: Probe }, timeoutMs = 3000): Promise<HealthChecks> {
  const [db, storage] = await Promise.all([probe(probes.db, timeoutMs), probe(probes.storage, timeoutMs)]);
  return { db, storage };
}
