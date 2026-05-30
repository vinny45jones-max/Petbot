import type { Payload } from 'payload';
import { sql } from 'drizzle-orm';

/**
 * Атомарно выдаёт следующий номер питомца из Postgres sequence.
 * Sequence создаётся миграцией <ts>_pet_number_sequence.
 */
export async function nextPetNumber(payload: Payload): Promise<number> {
  const result: any = await (payload.db as any).drizzle.execute(
    sql`SELECT nextval('pet_number_seq')`,
  );
  const row = result?.rows?.[0];
  const value = row?.nextval ?? row?.['nextval'];
  if (value === undefined || value === null) {
    throw new Error("nextPetNumber: pet_number_seq returned no value");
  }
  return Number(value);
}
