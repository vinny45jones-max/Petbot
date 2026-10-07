export interface RateOpts {
  limit: number;
  windowMs: number;
  now: number;
}

/** Чистая проверка: разрешён ли ещё один запрос при данных таймстампах попаданий. */
export function slidingWindowAllow(hits: number[], opts: RateOpts): boolean {
  const fresh = hits.filter((t) => t > opts.now - opts.windowMs);
  return fresh.length < opts.limit;
}

// --- Хранилище в памяти процесса (MVP, один инстанс Railway). В фазе 2 — Redis. ---
const store = new Map<string, number[]>();

/**
 * Регистрирует попадание и говорит, не превышен ли лимит.
 * key обычно `${route}:${ip}`. Возвращает true, если запрос разрешён.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const prev = store.get(key) ?? [];
  const fresh = prev.filter((t) => t > now - windowMs);
  const allowed = slidingWindowAllow(fresh, { limit, windowMs, now });
  if (allowed) {
    fresh.push(now);
    store.set(key, fresh);
  }
  return allowed;
}

/** Достаёт IP клиента из заголовков (Railway/CF проксируют через x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip') ?? 'unknown';
}
