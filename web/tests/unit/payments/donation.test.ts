import { describe, it, expect } from 'vitest';
import { buildAccountNo, mapProviderStatus, receiptData, isAccountNo, eripHelpPath } from '@/lib/payments/donation';

describe('donation helpers', () => {
  it('buildAccountNo is prefixed and fits ExpressPay AccountNo (String(30))', () => {
    const a = buildAccountNo('abc123');
    expect(a).toBe('don-abc123');
    expect(buildAccountNo(2_147_483_647).length).toBeLessThanOrEqual(30);
  });
  // коды: https://express-pay.by/docs/api/v1 — «Статусы счетов» и «Статусы счетов по карте»
  it('maps ЕРИП invoice Status', () => {
    expect(mapProviderStatus(3, 'erip')).toBe('paid');
    expect(mapProviderStatus('6', 'erip')).toBe('paid'); // оплачен картой
    expect(mapProviderStatus(1, 'erip')).toBe('pending');
    expect(mapProviderStatus(4, 'erip')).toBe('pending'); // частично — не считаем
    expect(mapProviderStatus(2, 'erip')).toBe('failed'); // просрочен
    expect(mapProviderStatus(5, 'erip')).toBe('failed'); // отменён
    expect(mapProviderStatus(7, 'erip')).toBe('refunded');
    expect(mapProviderStatus(8, 'erip')).toBe('refunded');
    expect(mapProviderStatus(999, 'erip')).toBe('pending');
    expect(mapProviderStatus(undefined, 'erip')).toBe('pending');
  });
  it('maps card invoice CardInvoiceStatus', () => {
    expect(mapProviderStatus(2, 'card')).toBe('paid');
    expect(mapProviderStatus(0, 'card')).toBe('pending');
    expect(mapProviderStatus(1, 'card')).toBe('pending'); // холд
    expect(mapProviderStatus(5, 'card')).toBe('pending'); // 3-D Secure
    expect(mapProviderStatus(3, 'card')).toBe('failed');
    expect(mapProviderStatus(6, 'card')).toBe('failed');
    expect(mapProviderStatus(4, 'card')).toBe('refunded');
    expect(mapProviderStatus(null, 'card')).toBe('pending');
  });
  it('receiptData formats target line', () => {
    const r = receiptData({ amountByn: 25, targetType: 'animal', targetLabel: 'Рекс №12' });
    expect(r.amountText).toContain('25');
    expect(r.targetText).toContain('Рекс №12');
    expect(receiptData({ amountByn: 5, targetType: 'general_fund' }).targetText).toBe('в общий фонд');
  });
});

describe('ЕРИП: номер заказа для страницы инструкции', () => {
  it('isAccountNo принимает только наш формат', () => {
    expect(isAccountNo('don-42')).toBe(true);
    expect(isAccountNo('don-')).toBe(false);
    expect(isAccountNo('Позвоните по номеру')).toBe(false);
    expect(isAccountNo('don-42<script>')).toBe(false);
  });
  it('eripHelpPath ведёт на /help/erip/<номер>', () => {
    expect(eripHelpPath('don-42')).toBe('/help/erip/don-42');
  });
});
