import { describe, it, expect, vi } from 'vitest';
import { runReconcile, type ReconcileDeps } from '@/lib/payments/reconcile';

const NOW = new Date('2026-11-11T12:00:00Z');

function deps(statuses: Record<string, string | Error>, over: Partial<ReconcileDeps> = {}) {
  return {
    now: NOW,
    findStalePending: vi.fn(async () => Object.keys(statuses).map((inv, i) => ({ id: i + 1, providerInvoiceId: inv }))),
    confirmStatus: vi.fn(async (inv: string) => { const s = statuses[inv]; if (s instanceof Error) throw s; return s as any; }),
    finalizePaid: vi.fn(async () => {}),
    setStatus: vi.fn(async () => {}),
    sendReport: vi.fn(async () => {}),
    ...over,
  };
}

describe('runReconcile (сверка зависших донатов)', () => {
  it('ищет только pending старше 15 минут', async () => {
    const d = deps({});
    await runReconcile(d);
    expect(d.findStalePending).toHaveBeenCalledWith(new Date('2026-11-11T11:45:00Z'));
  });
  it('paid → финализация (тот же чек, что у webhook); failed/refunded → статус; pending и ошибки — остаются', async () => {
    const d = deps({ a: 'paid', b: 'failed', c: 'refunded', e: 'pending', f: new Error('down') });
    const r = await runReconcile(d);
    expect(r).toEqual({ fixed: 1, failed: 2, stillPending: 2 });
    expect(d.finalizePaid).toHaveBeenCalledWith(1);
    expect(d.setStatus).toHaveBeenCalledWith(2, 'failed');
    expect(d.setStatus).toHaveBeenCalledWith(3, 'refunded');
  });
  it('отчёт админу только когда что-то поменялось', async () => {
    const quiet = deps({ e: 'pending' });
    await runReconcile(quiet);
    expect(quiet.sendReport).not.toHaveBeenCalled();
    const busy = deps({ a: 'paid' });
    await runReconcile(busy);
    expect(busy.sendReport).toHaveBeenCalledWith({ fixed: 1, failed: 0, stillPending: 0 });
  });
  it('сбой отправки отчёта не роняет сверку', async () => {
    const d = deps({ a: 'paid' }, { sendReport: vi.fn(async () => { throw new Error('no resend'); }) });
    await expect(runReconcile(d)).resolves.toEqual({ fixed: 1, failed: 0, stillPending: 0 });
  });
});
