import { describe, it, expect } from 'vitest';
import { sumPaidByn, donorCount } from '@/lib/payments/aggregate';

const rows = [
  { id: 1, amountByn: 25, status: 'paid', donorUser: 'u1', donorEmail: null },
  { id: 2, amountByn: 10, status: 'paid', donorUser: { id: 'u1' }, donorEmail: null }, // тот же донор, populated
  { id: 3, amountByn: 50, status: 'paid', donorUser: null, donorEmail: 'A@x' },
  { id: 4, amountByn: 5, status: 'paid', donorUser: null, donorEmail: 'a@X' }, // тот же email
  { id: 5, amountByn: 0.1, status: 'paid', donorUser: null, donorEmail: null }, // аноним
  { id: 6, amountByn: 0.2, status: 'paid', donorUser: null, donorEmail: null }, // другой аноним
  { id: 7, amountByn: 99, status: 'pending', donorUser: 'u9', donorEmail: null },
];

describe('aggregate', () => {
  it('sums only paid, rounded to kopecks', () => {
    expect(sumPaidByn(rows as any)).toBe(90.3);
  });
  it('counts distinct paid donors: by user, else email (case-insensitive), each anonymous separately', () => {
    expect(donorCount(rows as any)).toBe(4);
  });
});
