import type { DonationStatus } from './donation.ts';

export interface ReconcileDeps {
  now: Date;
  findStalePending: (createdBefore: Date) => Promise<Array<{ id: string | number; providerInvoiceId: string }>>;
  confirmStatus: (providerInvoiceId: string) => Promise<DonationStatus>;
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

/** Добивает донаты, по которым не дошёл webhook: спрашивает статус у ExpressPay. */
export async function runReconcile(deps: ReconcileDeps): Promise<ReconcileResult> {
  const r: ReconcileResult = { fixed: 0, failed: 0, stillPending: 0 };
  const stale = await deps.findStalePending(new Date(deps.now.getTime() - STALE_MIN * 60 * 1000));
  for (const d of stale) {
    let status: DonationStatus;
    try {
      status = await deps.confirmStatus(d.providerInvoiceId);
    } catch (e) {
      console.error('[reconcile] status check failed', d.id, e);
      r.stillPending++;
      continue;
    }
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
