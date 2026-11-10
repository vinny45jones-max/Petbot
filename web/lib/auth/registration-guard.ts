import { APIError } from 'payload';

export interface RegistrationGuardDeps {
  verify: (token: string | null, ip: string) => Promise<boolean>;
  allow: (key: string) => boolean;
}

interface GuardArgs {
  operation: string;
  args: any;
  req: { payloadAPI?: string; user?: unknown; headers: Headers };
}

/**
 * beforeOperation для Users: анонимная регистрация через REST (`POST /api/users`) проходит
 * rate-limit по IP и Turnstile (токен в заголовке `x-turnstile-token`).
 * Local API (сид, вход через Telegram) и создание пользователя из админки не затрагиваются.
 */
export function makeRegistrationGuard(deps: RegistrationGuardDeps) {
  return async ({ operation, args, req }: GuardArgs) => {
    if (operation !== 'create' || req.payloadAPI !== 'REST' || req.user) return args;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('cf-connecting-ip') || 'unknown';
    if (!deps.allow(`register:${ip}`)) {
      throw new APIError('Слишком много регистраций. Попробуйте позже.', 429, undefined, true);
    }
    if (!(await deps.verify(req.headers.get('x-turnstile-token'), ip))) {
      throw new APIError('Проверка не пройдена. Обновите страницу.', 400, undefined, true);
    }
    return args;
  };
}
