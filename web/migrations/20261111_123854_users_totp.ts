import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" ADD COLUMN "totp_enabled" boolean DEFAULT false;
  ALTER TABLE "users" ADD COLUMN "totp_secret_enc" varchar;
  ALTER TABLE "users" ADD COLUMN "totp_recovery_hashes" jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" DROP COLUMN "totp_enabled";
  ALTER TABLE "users" DROP COLUMN "totp_secret_enc";
  ALTER TABLE "users" DROP COLUMN "totp_recovery_hashes";`)
}
