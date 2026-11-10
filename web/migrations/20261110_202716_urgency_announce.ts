import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "notification_preferences" ADD COLUMN "urgent_last_sent_at" timestamp(3) with time zone;
  ALTER TABLE "animals" ADD COLUMN "urgent_announced_at" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "notification_preferences" DROP COLUMN "urgent_last_sent_at";
  ALTER TABLE "animals" DROP COLUMN "urgent_announced_at";`)
}
