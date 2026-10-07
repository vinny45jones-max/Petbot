import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_legal_articles_category" AS ENUM('general', 'cruelty', 'lost_pet', 'adoption_rights');
  CREATE TABLE "legal_articles_npa_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "legal_articles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"category" "enum_legal_articles_category" DEFAULT 'general' NOT NULL,
  	"excerpt" varchar,
  	"body" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "legal_articles_id" integer;
  ALTER TABLE "legal_articles_npa_links" ADD CONSTRAINT "legal_articles_npa_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."legal_articles"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "legal_articles_npa_links_order_idx" ON "legal_articles_npa_links" USING btree ("_order");
  CREATE INDEX "legal_articles_npa_links_parent_id_idx" ON "legal_articles_npa_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "legal_articles_slug_idx" ON "legal_articles" USING btree ("slug");
  CREATE INDEX "legal_articles_category_idx" ON "legal_articles" USING btree ("category");
  CREATE INDEX "legal_articles_updated_at_idx" ON "legal_articles" USING btree ("updated_at");
  CREATE INDEX "legal_articles_created_at_idx" ON "legal_articles" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_legal_articles_fk" FOREIGN KEY ("legal_articles_id") REFERENCES "public"."legal_articles"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_legal_articles_id_idx" ON "payload_locked_documents_rels" USING btree ("legal_articles_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "legal_articles_npa_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "legal_articles" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "legal_articles_npa_links" CASCADE;
  DROP TABLE "legal_articles" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_legal_articles_fk";
  
  DROP INDEX "payload_locked_documents_rels_legal_articles_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "legal_articles_id";
  DROP TYPE "public"."enum_legal_articles_category";`)
}
