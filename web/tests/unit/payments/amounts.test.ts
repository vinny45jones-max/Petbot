import { describe, it, expect } from 'vitest';
import { PRESET_AMOUNTS, parseAmount, formatByn, toProviderAmount, parseProviderAmount } from '@/lib/payments/amounts';

describe('amounts', () => {
  it('exposes presets', () => {
    expect(PRESET_AMOUNTS).toEqual([10, 25, 50, 100]);
  });
  it('parses valid amounts and rounds to 2 decimals', () => {
    expect(parseAmount('25')).toEqual({ ok: true, value: 25 });
    expect(parseAmount('9,90')).toEqual({ ok: true, value: 9.9 });
    expect(parseAmount('10.005').ok).toBe(false);
  });
  it('rejects non-positive, NaN, too large', () => {
    expect(parseAmount('0').ok).toBe(false);
    expect(parseAmount('-5').ok).toBe(false);
    expect(parseAmount('abc').ok).toBe(false);
    expect(parseAmount('1000000').ok).toBe(false);
    expect(parseAmount('0,99')).toEqual({ ok: false, error: 'Минимальная сумма — 1 BYN' });
    expect(parseAmount('1').ok).toBe(true);
  });
  it('formats BYN', () => {
    expect(formatByn(25)).toContain('25');
    expect(formatByn(25)).toMatch(/BYN|р/i);
  });
  // ExpressPay принимает и шлёт сумму с запятой («25,00»)
  it('formats and parses provider amount with comma', () => {
    expect(toProviderAmount(25)).toBe('25,00');
    expect(toProviderAmount(9.9)).toBe('9,90');
    expect(parseProviderAmount('12,50')).toBe(12.5);
    expect(parseProviderAmount(7)).toBe(7);
    expect(Number.isNaN(parseProviderAmount('x'))).toBe(true);
  });
});
