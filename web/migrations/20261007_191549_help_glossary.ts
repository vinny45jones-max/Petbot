import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_help_articles_category" AS ENUM('faq', 'how_it_works', 'safety', 'guide');
  CREATE TABLE "help_articles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"category" "enum_help_articles_category" DEFAULT 'faq' NOT NULL,
  	"body" jsonb,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "glossary_terms" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"term" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"definition" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "help_articles_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "glossary_terms_id" integer;
  CREATE UNIQUE INDEX "help_articles_slug_idx" ON "help_articles" USING btree ("slug");
  CREATE INDEX "help_articles_category_idx" ON "help_articles" USING btree ("category");
  CREATE INDEX "help_articles_updated_at_idx" ON "help_articles" USING btree ("updated_at");
  CREATE INDEX "help_articles_created_at_idx" ON "help_articles" USING btree ("created_at");
  CREATE UNIQUE INDEX "glossary_terms_slug_idx" ON "glossary_terms" USING btree ("slug");
  CREATE INDEX "glossary_terms_updated_at_idx" ON "glossary_terms" USING btree ("updated_at");
  CREATE INDEX "glossary_terms_created_at_idx" ON "glossary_terms" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_help_articles_fk" FOREIGN KEY ("help_articles_id") REFERENCES "public"."help_articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_glossary_terms_fk" FOREIGN KEY ("glossary_terms_id") REFERENCES "public"."glossary_terms"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_help_articles_id_idx" ON "payload_locked_documents_rels" USING btree ("help_articles_id");
  CREATE INDEX "payload_locked_documents_rels_glossary_terms_id_idx" ON "payload_locked_documents_rels" USING btree ("glossary_terms_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "help_articles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glossary_terms" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "help_articles" CASCADE;
  DROP TABLE "glossary_terms" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_help_articles_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_glossary_terms_fk";
  
  DROP INDEX "payload_locked_documents_rels_help_articles_id_idx";
  DROP INDEX "payload_locked_documents_rels_glossary_terms_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "help_articles_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "glossary_terms_id";
  DROP TYPE "public"."enum_help_articles_category";`)
}
