import type { DonationStatus, InvoiceKind } from './donation.ts';

export interface ReconcileDeps {
  now: Date;
  /** Самые старые pending первыми, не больше limit за прогон. */
  findStalePending: (createdBefore: Date, limit: number) => Promise<Array<{ id: string | number; providerInvoiceId: string; kind: InvoiceKind; createdAt: string }>>;
  confirmStatus: (providerInvoiceId: string, kind: InvoiceKind) => Promise<DonationStatus>;
  finalizePaid: (id: string | number) => Promise<void>;
  setStatus: (id: string | number, status: DonationStatus) => Promise<void>;
  sendReport: (r: ReconcileResult) => Promise<void>;
}
export interface ReconcileResult {
  fixed: number;
  failed: number;
  stillPending: number;
}

const STALE_MIN = 15; // моложе — человек, возможно, ещё платит
const ABANDON_DAYS = 7; // ЕРИП-счёт живёт неделю, карточный — сутки: дольше pending = брошен
const BATCH = 100; // за прогон; остальное — в следующий час

/** Добивает донаты, по которым не дошёл webhook: спрашивает статус у ExpressPay. */
export async function runReconcile(deps: ReconcileDeps): Promise<ReconcileResult> {
  const r: ReconcileResult = { fixed: 0, failed: 0, stillPending: 0 };
  const stale = await deps.findStalePending(new Date(deps.now.getTime() - STALE_MIN * 60 * 1000), BATCH);
  const abandonBefore = deps.now.getTime() - ABANDON_DAYS * 24 * 3600 * 1000;
  for (const d of stale) {
    let status: DonationStatus;
    try {
      status = await deps.confirmStatus(d.providerInvoiceId, d.kind);
    } catch (e) {
      console.error('[reconcile] status check failed', d.id, e);
      r.stillPending++;
      continue;
    }
    if (status === 'pending' && new Date(d.createdAt).getTime() < abandonBefore) status = 'failed';
    if (status === 'paid') {
      await deps.finalizePaid(d.id);
      r.fixed++;
    } else if (status === 'failed' || status === 'refunded') {
      await deps.setStatus(d.id, status);
      r.failed++;
    } else {
      r.stillPending++;
    }
  }
  if (r.fixed || r.failed) await deps.sendReport(r).catch((e) => console.error('[reconcile] report failed (non-fatal)', e));
  return r;
}
