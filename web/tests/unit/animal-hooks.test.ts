import { describe, it, expect, vi } from 'vitest';
import { makeAnimalBeforeChangeHook, makeAnimalLifecycleStamps } from '@/lib/animal-hooks';

const NOW = new Date('2026-05-28T12:00:00Z');

function deps(overrides: Partial<Parameters<typeof makeAnimalBeforeChangeHook>[0]> = {}) {
  return {
    nextPetNumber: vi.fn().mockResolvedValue(123),
    getFacilityHoldDays: vi.fn().mockResolvedValue(5),
    now: () => NOW,
    ...overrides,
  };
}

describe('makeAnimalBeforeChangeHook', () => {
  it('assigns petNumber and slug on create', async () => {
    const hook = makeAnimalBeforeChangeHook(deps());
    const data = await hook({ operation: 'create', data: { name: 'Рекс', species: 'dog' } } as any);
    expect(data.petNumber).toBe(123);
    expect(data.slug).toBe('123-reks');
  });

  it('uses species when name is empty', async () => {
    const hook = makeAnimalBeforeChangeHook(deps());
    const data = await hook({ operation: 'create', data: { species: 'cat' } } as any);
    expect(data.slug).toBe('123-cat');
  });

  it('does not reassign petNumber on update', async () => {
    const d = deps();
    const hook = makeAnimalBeforeChangeHook(d);
    const data = await hook({
      operation: 'update',
      data: { name: 'Рекс', species: 'dog' },
      originalDoc: { petNumber: 7, slug: '7-reks' },
    } as any);
    expect(d.nextPetNumber).not.toHaveBeenCalled();
    expect(data.petNumber).toBe(7);
    expect(data.slug).toBe('7-reks');
  });

  it('computes deadline and high urgency from intake facility', async () => {
    const hook = makeAnimalBeforeChangeHook(deps());
    const data = await hook({
      operation: 'create',
      data: { species: 'dog', intakeFacility: 'fac1', intakeDate: '2026-05-28T00:00:00Z' },
    } as any);
    expect(new Date(data.legalDeadlineDate).toISOString()).toBe('2026-06-02T00:00:00.000Z');
    expect(data.urgencyLevel).toBe('high'); // дедлайн 02.06, now 28.05 => 5 дней => high
  });

  it('respects manual legalDeadlineDate override', async () => {
    const d = deps();
    const hook = makeAnimalBeforeChangeHook(d);
    const data = await hook({
      operation: 'create',
      data: { species: 'dog', intakeFacility: 'fac1', intakeDate: '2026-05-28T00:00:00Z', legalDeadlineDate: '2026-05-30T00:00:00Z' },
    } as any);
    expect(d.getFacilityHoldDays).not.toHaveBeenCalled();
    expect(data.urgencyLevel).toBe('critical'); // 2 дня
    expect(data.urgencyRank).toBe(2);
  });

  it('sets normal urgency without facility', async () => {
    const hook = makeAnimalBeforeChangeHook(deps());
    const data = await hook({ operation: 'create', data: { species: 'cat' } } as any);
    expect(data.legalDeadlineDate ?? null).toBeNull();
    expect(data.urgencyLevel).toBe('normal');
    expect(data.urgencyRank).toBe(0);
  });

  it('fills descriptionPlain from richText description', async () => {
    const hook = makeAnimalBeforeChangeHook(deps());
    const data = await hook({
      operation: 'create',
      data: { species: 'dog', description: { root: { children: [
        { type: 'paragraph', children: [{ type: 'text', text: 'Добрый пёс' }] },
      ] } } },
    } as any);
    expect(data.descriptionPlain).toBe('Добрый пёс');
  });
});

describe('makeAnimalLifecycleStamps', () => {
  const stamp = makeAnimalLifecycleStamps(() => NOW);

  it('sets publishedAt on CREATE with status=published', () => {
    const data = stamp({ operation: 'create', data: { status: 'published' } } as any);
    expect(data.publishedAt).toBe(NOW.toISOString());
  });

  it('sets publishedAt on update with status=published', () => {
    const data = stamp({ operation: 'update', data: { status: 'published' } } as any);
    expect(data.publishedAt).toBe(NOW.toISOString());
  });

  it('does not overwrite existing publishedAt', () => {
    const existing = '2020-01-01T00:00:00.000Z';
    const data = stamp({ operation: 'update', data: { status: 'published', publishedAt: existing } } as any);
    expect(data.publishedAt).toBe(existing);
  });

  it('sets adoptedAt on CREATE with status=adopted', () => {
    const data = stamp({ operation: 'create', data: { status: 'adopted' } } as any);
    expect(data.adoptedAt).toBe(NOW.toISOString());
  });

  it('leaves stamps null for draft', () => {
    const data = stamp({ operation: 'create', data: { status: 'draft' } } as any);
    expect(data.publishedAt ?? null).toBeNull();
    expect(data.adoptedAt ?? null).toBeNull();
  });
});
