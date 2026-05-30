import type { Payload } from 'payload';
import { sql } from 'drizzle-orm';

export function normalizeQuery(q: string): string {
  return (q ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Полнотекстовый поиск опубликованных животных. Возвращает id по убыванию релевантности.
 * Использует search_vector (generated) + ts_rank. limit ограничивает выдачу.
 */
export async function searchAnimalIds(payload: Payload, query: string, limit = 200): Promise<number[]> {
  const q = normalizeQuery(query);
  if (!q) return [];
  const result: any = await (payload.db as any).drizzle.execute(sql`
    SELECT id
    FROM animals
    WHERE status = 'published'
      AND search_vector @@ plainto_tsquery('russian', ${q})
    ORDER BY ts_rank(search_vector, plainto_tsquery('russian', ${q})) DESC
    LIMIT ${limit}
  `);
  return (result?.rows ?? []).map((r: any) => Number(r.id));
}
