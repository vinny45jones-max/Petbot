import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS pet_number_seq START WITH 1 INCREMENT BY 1`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP SEQUENCE IF EXISTS pet_number_seq`);
}
