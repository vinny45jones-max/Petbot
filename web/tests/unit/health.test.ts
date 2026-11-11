import { describe, it, expect } from 'vitest';
import { aggregateHealth, runHealthChecks } from '@/lib/health';

describe('aggregateHealth', () => {
  it('ok, если ошибок нет; «не подключено» статус не портит', () => {
    expect(aggregateHealth({ db: 'ok', storage: 'off' })).toEqual({ status: 'ok', checks: { db: 'ok', storage: 'off' } });
  });
  it('degraded, если любая проверка упала', () => {
    expect(aggregateHealth({ db: 'ok', storage: 'error' }).status).toBe('degraded');
    expect(aggregateHealth({ db: 'error', storage: 'off' }).status).toBe('degraded');
  });
});

describe('runHealthChecks', () => {
  const ok = async () => {};
  const boom = async () => { throw new Error('down'); };
  const hang = () => new Promise<void>(() => {});

  it('все живы', async () => {
    expect(await runHealthChecks({ db: ok, storage: ok })).toEqual({ db: 'ok', storage: 'ok' });
  });
  it('null — проверка не настроена', async () => {
    expect(await runHealthChecks({ db: ok, storage: null })).toEqual({ db: 'ok', storage: 'off' });
  });
  it('исключение и зависание по таймауту — error', async () => {
    expect(await runHealthChecks({ db: boom, storage: hang }, 50)).toEqual({ db: 'error', storage: 'error' });
  });
});

describe('memoizeFor', () => {
  it('в пределах TTL — один вызов, в том числе для параллельных запросов; после TTL — новый', async () => {
    const { memoizeFor } = await import('@/lib/health');
    let t = 0; let calls = 0;
    const get = memoizeFor(async () => ++calls, 30_000, () => t);
    expect(await Promise.all([get(), get()])).toEqual([1, 1]);
    t = 29_999;
    expect(await get()).toBe(1);
    t = 30_000;
    expect(await get()).toBe(2);
  });
  it('ошибку не кэширует', async () => {
    const { memoizeFor } = await import('@/lib/health');
    let calls = 0;
    const get = memoizeFor(async () => { calls++; if (calls === 1) throw new Error('down'); return calls; }, 30_000, () => 0);
    await expect(get()).rejects.toThrow('down');
    expect(await get()).toBe(2);
  });
});
