import { describe, it, expect } from 'vitest';
import { makeRegistrationGuard } from '@/lib/auth/registration-guard';

function setup(opts: { verifyOk?: boolean; allowOk?: boolean } = {}) {
  const calls = { verify: [] as [string | null, string][], allow: [] as string[] };
  const guard = makeRegistrationGuard({
    verify: async (token, ip) => { calls.verify.push([token, ip]); return opts.verifyOk ?? true; },
    allow: (key) => { calls.allow.push(key); return opts.allowOk ?? true; },
  });
  return { guard, calls };
}

const req = (over: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
  ({ payloadAPI: 'REST', user: null, headers: new Headers(headers), ...over }) as any;

const ARGS = { data: { email: 'a@x.by' } };

describe('makeRegistrationGuard', () => {
  it('анонимная REST-регистрация: проверяет лимит по IP и токен Turnstile, пропускает', async () => {
    const { guard, calls } = setup();
    const out = await guard({ operation: 'create', args: ARGS, req: req({}, { 'x-forwarded-for': '1.2.3.4, 9.9.9.9', 'x-turnstile-token': 'tok' }) });
    expect(out).toBe(ARGS);
    expect(calls.allow).toEqual(['register:1.2.3.4']);
    expect(calls.verify).toEqual([['tok', '1.2.3.4']]);
  });

  it('превышен лимит → 429, Turnstile не дёргается', async () => {
    const { guard, calls } = setup({ allowOk: false });
    await expect(guard({ operation: 'create', args: ARGS, req: req() })).rejects.toMatchObject({ status: 429 });
    expect(calls.verify).toHaveLength(0);
  });

  it('Turnstile не пройден → 400', async () => {
    const { guard } = setup({ verifyOk: false });
    await expect(guard({ operation: 'create', args: ARGS, req: req() })).rejects.toMatchObject({ status: 400 });
  });

  it('не трогает Local API, залогиненных (админка) и другие операции', async () => {
    const { guard, calls } = setup({ verifyOk: false, allowOk: false });
    await guard({ operation: 'create', args: ARGS, req: req({ payloadAPI: 'local' }) });
    await guard({ operation: 'create', args: ARGS, req: req({ user: { id: 1 } }) });
    await guard({ operation: 'login', args: ARGS, req: req() });
    expect(calls.allow).toHaveLength(0);
    expect(calls.verify).toHaveLength(0);
  });

  it('создание первого администратора (/api/users/first-register) не требует Turnstile', async () => {
    const { guard, calls } = setup({ verifyOk: false });
    const out = await guard({ operation: 'create', args: ARGS, req: req({ pathname: '/api/users/first-register' }) });
    expect(out).toBe(ARGS);
    expect(calls.verify).toHaveLength(0);
    await expect(guard({ operation: 'create', args: ARGS, req: req({ pathname: '/api/users' }) })).rejects.toMatchObject({ status: 400 });
  });
});
