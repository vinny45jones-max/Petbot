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
