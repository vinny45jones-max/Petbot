import { describe, it, expect } from 'vitest';
import { validateComment, validateCrueltyReport, validatePartnerApplication } from '@/lib/content/validate';

describe('validateComment', () => {
  it('accepts a normal comment', () => {
    expect(validateComment({ body: 'Какой красивый пёс!' }).ok).toBe(true);
  });
  it('rejects empty and too long', () => {
    expect(validateComment({ body: '   ' }).ok).toBe(false);
    expect(validateComment({ body: 'x'.repeat(2001) }).ok).toBe(false);
  });
});

describe('validateCrueltyReport', () => {
  it('requires a description of >= 20 chars', () => {
    expect(validateCrueltyReport({ description: 'мало' }).ok).toBe(false);
    expect(validateCrueltyReport({ description: 'Во дворе держат собаку на цепи без воды и еды.' }).ok).toBe(true);
  });
});

describe('validatePartnerApplication', () => {
  it('requires name, contact and a 9-digit UNP', () => {
    expect(validatePartnerApplication({ name: '', contact: 'x', unp: '123456789' }).ok).toBe(false);
    expect(validatePartnerApplication({ name: 'Приют «Лапа»', contact: '+375291112233', unp: '12345678' }).ok).toBe(false);
    expect(validatePartnerApplication({ name: 'Приют «Лапа»', contact: '+375291112233', unp: '123456789' }).ok).toBe(true);
  });
});
