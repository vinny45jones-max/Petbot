import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_cruelty_reports_status" AS ENUM('new', 'in_progress', 'closed');
  CREATE TYPE "public"."enum_partner_applications_status" AS ENUM('new', 'in_review', 'approved', 'rejected');
  CREATE TABLE "cruelty_reports" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"description" varchar NOT NULL,
  	"contact" varchar,
  	"reporter_user_id" integer,
  	"location_city_id" integer,
  	"status" "enum_cruelty_reports_status" DEFAULT 'new',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cruelty_reports_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "partner_applications" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"unp" varchar,
  	"contact" varchar NOT NULL,
  	"links" varchar,
  	"message" varchar,
  	"status" "enum_partner_applications_status" DEFAULT 'new',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cruelty_reports_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "partner_applications_id" integer;
  ALTER TABLE "cruelty_reports" ADD CONSTRAINT "cruelty_reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cruelty_reports" ADD CONSTRAINT "cruelty_reports_location_city_id_cities_id_fk" FOREIGN KEY ("location_city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cruelty_reports_rels" ADD CONSTRAINT "cruelty_reports_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."cruelty_reports"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cruelty_reports_rels" ADD CONSTRAINT "cruelty_reports_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "cruelty_reports_reporter_user_idx" ON "cruelty_reports" USING btree ("reporter_user_id");
  CREATE INDEX "cruelty_reports_location_city_idx" ON "cruelty_reports" USING btree ("location_city_id");
  CREATE INDEX "cruelty_reports_status_idx" ON "cruelty_reports" USING btree ("status");
  CREATE INDEX "cruelty_reports_updated_at_idx" ON "cruelty_reports" USING btree ("updated_at");
  CREATE INDEX "cruelty_reports_created_at_idx" ON "cruelty_reports" USING btree ("created_at");
  CREATE INDEX "cruelty_reports_rels_order_idx" ON "cruelty_reports_rels" USING btree ("order");
  CREATE INDEX "cruelty_reports_rels_parent_idx" ON "cruelty_reports_rels" USING btree ("parent_id");
  CREATE INDEX "cruelty_reports_rels_path_idx" ON "cruelty_reports_rels" USING btree ("path");
  CREATE INDEX "cruelty_reports_rels_media_id_idx" ON "cruelty_reports_rels" USING btree ("media_id");
  CREATE INDEX "partner_applications_status_idx" ON "partner_applications" USING btree ("status");
  CREATE INDEX "partner_applications_updated_at_idx" ON "partner_applications" USING btree ("updated_at");
  CREATE INDEX "partner_applications_created_at_idx" ON "partner_applications" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cruelty_reports_fk" FOREIGN KEY ("cruelty_reports_id") REFERENCES "public"."cruelty_reports"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_partner_applications_fk" FOREIGN KEY ("partner_applications_id") REFERENCES "public"."partner_applications"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_cruelty_reports_id_idx" ON "payload_locked_documents_rels" USING btree ("cruelty_reports_id");
  CREATE INDEX "payload_locked_documents_rels_partner_applications_id_idx" ON "payload_locked_documents_rels" USING btree ("partner_applications_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cruelty_reports" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cruelty_reports_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "partner_applications" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cruelty_reports" CASCADE;
  DROP TABLE "cruelty_reports_rels" CASCADE;
  DROP TABLE "partner_applications" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_cruelty_reports_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_partner_applications_fk";
  
  DROP INDEX "payload_locked_documents_rels_cruelty_reports_id_idx";
  DROP INDEX "payload_locked_documents_rels_partner_applications_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "cruelty_reports_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "partner_applications_id";
  DROP TYPE "public"."enum_cruelty_reports_status";
  DROP TYPE "public"."enum_partner_applications_status";`)
}
