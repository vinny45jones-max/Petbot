import { describe, it, expect, vi } from 'vitest';
import { nextPetNumber } from '@/lib/pet-number';

describe('nextPetNumber', () => {
  it('returns the integer from nextval()', async () => {
    const payload = {
      db: { drizzle: { execute: vi.fn().mockResolvedValue({ rows: [{ nextval: '42' }] }) } },
    } as any;
    const n = await nextPetNumber(payload);
    expect(n).toBe(42);
    expect(payload.db.drizzle.execute).toHaveBeenCalledOnce();
  });

  it('throws if sequence returns no rows', async () => {
    const payload = {
      db: { drizzle: { execute: vi.fn().mockResolvedValue({ rows: [] }) } },
    } as any;
    await expect(nextPetNumber(payload)).rejects.toThrow(/pet_number_seq/);
  });
});
