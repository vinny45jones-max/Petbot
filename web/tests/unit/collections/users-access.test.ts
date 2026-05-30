import { describe, it, expect } from 'vitest';
import { Users } from '@/collections/Users';

// Поля Users.fields — union типов; для рантайм-доступа к access кастуем.
const field = (name: string) =>
  (Users.fields as any[]).find((f) => f.name === name);

const ctx = (user: unknown) => ({ req: { user } }) as any;
const anon = ctx(null);
const citizen = ctx({ role: 'citizen' });
const moderator = ctx({ role: 'moderator' });
const superadmin = ctx({ role: 'superadmin' });

describe('Users — защита от self-escalation роли на create', () => {
  describe('field role: create access', () => {
    it('аноним не может задать роль (→ defaultValue citizen)', () => {
      expect(field('role').access?.create?.(anon)).toBe(false);
    });
    it('citizen не может повысить себя', () => {
      expect(field('role').access?.create?.(citizen)).toBe(false);
    });
    it('moderator не назначает роли (только superadmin)', () => {
      expect(field('role').access?.create?.(moderator)).toBe(false);
    });
    it('superadmin может задать роль', () => {
      expect(field('role').access?.create?.(superadmin)).toBe(true);
    });
  });

  describe('field role: update access (регрессия — не меняется)', () => {
    it('только superadmin', () => {
      expect(field('role').access?.update?.(superadmin)).toBe(true);
      expect(field('role').access?.update?.(anon)).toBe(false);
      expect(field('role').access?.update?.(moderator)).toBe(false);
    });
  });

  describe('field isBlocked: create access', () => {
    it('аноним не может выставить isBlocked', () => {
      expect(field('isBlocked').access?.create?.(anon)).toBe(false);
    });
    it('admin (moderator/superadmin) может', () => {
      expect(field('isBlocked').access?.create?.(moderator)).toBe(true);
      expect(field('isBlocked').access?.create?.(superadmin)).toBe(true);
    });
  });
});
