import { describe, it, expect, vi } from 'vitest';
import { changePassword } from '@/lib/auth/change-password';

function fakePayload(password: string, sessions = [{ id: 's-current' }, { id: 's-other' }]) {
  const state = { password, sessions: [...sessions] };
  return {
    state,
    login: vi.fn(async ({ data }: any) => {
      if (data.password !== state.password) throw new Error('The email or password provided is incorrect.');
      return { user: { id: 7 } };
    }),
    findByID: vi.fn(async () => ({ id: 7, sessions: state.sessions })),
    // Как Payload: при смене пароля остаётся только сессия req.user._sid (если это тот же пользователь)
    update: vi.fn(async ({ data, user }: any) => {
      if (data.password) {
        state.password = data.password;
        state.sessions = user?._sid ? state.sessions.filter((x) => x.id === user._sid) : [];
      }
      return {};
    }),
    create: vi.fn(async () => ({})),
  } as any;
}
const user = { id: 7, email: 'a@b.by' };
const allow = () => true;

describe('changePassword', () => {
  it('верный текущий пароль → новый сохранён, остальные сессии завершены, текущая жива', async () => {
    const p = fakePayload('old-pass-1');
    expect(await changePassword(p, user, { current: 'old-pass-1', next: 'new-pass-22', sid: 's-current' }, allow)).toEqual({ ok: true });
    expect(p.state.password).toBe('new-pass-22');
    expect(p.state.sessions).toEqual([{ id: 's-current' }]);
    expect(p.create).toHaveBeenCalledWith(expect.objectContaining({ collection: 'audit-logs', data: expect.objectContaining({ action: 'password.changed' }) }));
  });
  it('неверный текущий пароль → wrong_password, ничего не меняется', async () => {
    const p = fakePayload('old-pass-1');
    expect(await changePassword(p, user, { current: 'nope', next: 'new-pass-22', sid: 's-current' }, allow)).toEqual({ ok: false, error: 'wrong_password' });
    expect(p.state.password).toBe('old-pass-1');
    expect(p.update).not.toHaveBeenCalled();
  });
  it('короткий или совпадающий с текущим — отказ без проверки пароля', async () => {
    const p = fakePayload('old-pass-1');
    expect(await changePassword(p, user, { current: 'old-pass-1', next: 'short', sid: 's' }, allow)).toEqual({ ok: false, error: 'weak_password' });
    expect(await changePassword(p, user, { current: 'old-pass-1', next: 'old-pass-1', sid: 's' }, allow)).toEqual({ ok: false, error: 'same_password' });
    expect(p.login).not.toHaveBeenCalled();
  });
  it('rate limit', async () => {
    const p = fakePayload('old-pass-1');
    expect(await changePassword(p, user, { current: 'old-pass-1', next: 'new-pass-22', sid: 's' }, () => false)).toEqual({ ok: false, error: 'rate_limited' });
  });
});
