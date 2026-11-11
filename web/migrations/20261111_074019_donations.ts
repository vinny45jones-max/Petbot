import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_donations_target_type" AS ENUM('organization', 'animal', 'general_fund');
  CREATE TYPE "public"."enum_donations_payment_provider" AS ENUM('expresspay_erip', 'bank_transfer_manual');
  CREATE TYPE "public"."enum_donations_status" AS ENUM('pending', 'paid', 'failed', 'refunded');
  CREATE TABLE "donations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"donor_user_id" integer,
  	"donor_email" varchar,
  	"donor_phone" varchar,
  	"donor_name" varchar,
  	"amount_byn" numeric NOT NULL,
  	"currency" varchar DEFAULT 'BYN',
  	"target_type" "enum_donations_target_type" NOT NULL,
  	"organization_id" integer,
  	"animal_id" integer,
  	"purpose" varchar,
  	"payment_provider" "enum_donations_payment_provider" DEFAULT 'expresspay_erip',
  	"provider_invoice_id" varchar,
  	"account_no" varchar,
  	"status" "enum_donations_status" DEFAULT 'pending' NOT NULL,
  	"paid_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "donations_id" integer;
  ALTER TABLE "donations" ADD CONSTRAINT "donations_donor_user_id_users_id_fk" FOREIGN KEY ("donor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "donations" ADD CONSTRAINT "donations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "donations" ADD CONSTRAINT "donations_animal_id_animals_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animals"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "donations_donor_user_idx" ON "donations" USING btree ("donor_user_id");
  CREATE INDEX "donations_donor_email_idx" ON "donations" USING btree ("donor_email");
  CREATE INDEX "donations_target_type_idx" ON "donations" USING btree ("target_type");
  CREATE INDEX "donations_organization_idx" ON "donations" USING btree ("organization_id");
  CREATE INDEX "donations_animal_idx" ON "donations" USING btree ("animal_id");
  CREATE UNIQUE INDEX "donations_provider_invoice_id_idx" ON "donations" USING btree ("provider_invoice_id");
  CREATE UNIQUE INDEX "donations_account_no_idx" ON "donations" USING btree ("account_no");
  CREATE INDEX "donations_status_idx" ON "donations" USING btree ("status");
  CREATE INDEX "donations_updated_at_idx" ON "donations" USING btree ("updated_at");
  CREATE INDEX "donations_created_at_idx" ON "donations" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_donations_fk" FOREIGN KEY ("donations_id") REFERENCES "public"."donations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_donations_id_idx" ON "payload_locked_documents_rels" USING btree ("donations_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "donations" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "donations" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_donations_fk";
  
  DROP INDEX "payload_locked_documents_rels_donations_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "donations_id";
  DROP TYPE "public"."enum_donations_target_type";
  DROP TYPE "public"."enum_donations_payment_provider";
  DROP TYPE "public"."enum_donations_status";`)
}
