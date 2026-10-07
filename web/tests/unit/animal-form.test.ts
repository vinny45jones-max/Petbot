import { describe, it, expect } from 'vitest';
import { validateAnimalDraft, type AnimalDraft } from '@/lib/animal-form';

const valid: AnimalDraft = {
  species: 'dog', sex: 'male', size: 'medium',
  city: 'city-id-1', description: 'Хороший пёс ищет дом, дружелюбный.',
  contactPhone: '+375291112233', photoCount: 1,
};

describe('validateAnimalDraft', () => {
  it('passes a complete draft', () => {
    expect(validateAnimalDraft(valid)).toEqual({ ok: true, errors: {} });
  });
  it('requires species', () => {
    const r = validateAnimalDraft({ ...valid, species: undefined as any });
    expect(r.ok).toBe(false);
    expect(r.errors.species).toBeTruthy();
  });
  it('requires at least one photo', () => {
    const r = validateAnimalDraft({ ...valid, photoCount: 0 });
    expect(r.errors.photos).toBeTruthy();
  });
  it('requires city', () => {
    expect(validateAnimalDraft({ ...valid, city: '' }).errors.city).toBeTruthy();
  });
  it('requires a minimal description', () => {
    expect(validateAnimalDraft({ ...valid, description: 'мало' }).errors.description).toBeTruthy();
  });
  it('requires at least one contact', () => {
    const r = validateAnimalDraft({ ...valid, contactPhone: '', contactTelegram: '' });
    expect(r.errors.contact).toBeTruthy();
  });
  it('rejects malformed Belarus phone', () => {
    expect(validateAnimalDraft({ ...valid, contactPhone: '12345' }).errors.contactPhone).toBeTruthy();
  });
  it('accepts contact via telegram only', () => {
    const r = validateAnimalDraft({ ...valid, contactPhone: '', contactTelegram: '@owner' });
    expect(r.ok).toBe(true);
  });
  it('rejects microchip that is not 15 digits', () => {
    expect(validateAnimalDraft({ ...valid, microchipId: '123' }).errors.microchipId).toBeTruthy();
    expect(validateAnimalDraft({ ...valid, microchipId: '123456789012345' }).ok).toBe(true);
  });
});
