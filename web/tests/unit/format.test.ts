import { describe, it, expect } from 'vitest';
import { formatAge, formatAnimalTitle } from '@/lib/format';

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
