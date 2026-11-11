import { describe, it, expect } from 'vitest';
import { formatAge, formatAnimalTitle, pluralRu, formatByn, formatNumber, formatDate } from '@/lib/format';

describe('formatAge', () => {
  it('formats years with correct plural', () => {
    expect(formatAge(1, 0)).toBe('1 год');
    expect(formatAge(2, 0)).toBe('2 года');
    expect(formatAge(5, 0)).toBe('5 лет');
    expect(formatAge(21, 0)).toBe('21 год');
  });
  it('formats months when no years', () => {
    expect(formatAge(0, 3)).toBe('3 месяца');
    expect(formatAge(0, 5)).toBe('5 месяцев');
    expect(formatAge(0, 1)).toBe('1 месяц');
  });
  it('combines years and months', () => {
    expect(formatAge(1, 2)).toBe('1 год 2 месяца');
  });
  it('returns empty when unknown', () => {
    expect(formatAge(undefined, undefined)).toBe('');
    expect(formatAge(0, 0)).toBe('меньше месяца');
  });
});

describe('formatAnimalTitle', () => {
  it('uses name and number', () => {
    expect(formatAnimalTitle({ name: 'Рекс', petNumber: 123 })).toBe('Рекс №123');
  });
  it('falls back to number only', () => {
    expect(formatAnimalTitle({ name: null, petNumber: 7 })).toBe('№7');
  });
});

describe('pluralRu', () => {
  const f = { one: 'кот', few: 'кота', many: 'котов' };
  it.each([
    [1, 'кот'], [21, 'кот'], [101, 'кот'],
    [2, 'кота'], [3, 'кота'], [4, 'кота'], [22, 'кота'],
    [0, 'котов'], [5, 'котов'], [11, 'котов'], [12, 'котов'], [14, 'котов'],
    [25, 'котов'], [111, 'котов'], [112, 'котов'],
  ])('%i → %s', (n, expected) => {
    expect(pluralRu(n, f)).toBe(expected);
  });
});

describe('Intl-обёртки (ru-BY)', () => {
  it('formatByn содержит сумму', () => {
    const s = formatByn(1234.5);
    expect(s).toContain('1');
    expect(s).toContain('234');
    expect(/[,.]50/.test(s)).toBe(true);
  });
  it('formatNumber группирует тысячи', () => {
    expect(formatNumber(1000000).replace(/\s| | /g, '')).toBe('1000000');
  });
  it('formatDate возвращает непустую строку с годом', () => {
    expect(formatDate('2026-05-29T00:00:00Z')).toContain('2026');
  });
});
