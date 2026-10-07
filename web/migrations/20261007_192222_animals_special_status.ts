import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_animals_special_status" AS ENUM('reserved', 'needs_temp_home', 'quarantine');
  CREATE TABLE "animals_special_status" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_animals_special_status",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "animals_special_status" ADD CONSTRAINT "animals_special_status_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."animals"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "animals_special_status_order_idx" ON "animals_special_status" USING btree ("order");
  CREATE INDEX "animals_special_status_parent_idx" ON "animals_special_status" USING btree ("parent_id");
  CREATE INDEX "animals_special_status_value_idx" ON "animals_special_status" USING btree ("value");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "animals_special_status" CASCADE;
  DROP TYPE "public"."enum_animals_special_status";`)
}
