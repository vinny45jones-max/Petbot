import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_donations_payment_provider" ADD VALUE 'expresspay_card' BEFORE 'bank_transfer_manual';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "donations" ALTER COLUMN "payment_provider" SET DATA TYPE text;
  ALTER TABLE "donations" ALTER COLUMN "payment_provider" SET DEFAULT 'expresspay_erip'::text;
  DROP TYPE "public"."enum_donations_payment_provider";
  CREATE TYPE "public"."enum_donations_payment_provider" AS ENUM('expresspay_erip', 'bank_transfer_manual');
  ALTER TABLE "donations" ALTER COLUMN "payment_provider" SET DEFAULT 'expresspay_erip'::"public"."enum_donations_payment_provider";
  ALTER TABLE "donations" ALTER COLUMN "payment_provider" SET DATA TYPE "public"."enum_donations_payment_provider" USING "payment_provider"::"public"."enum_donations_payment_provider";`)
}
