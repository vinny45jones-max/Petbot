import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_comments_target_type" AS ENUM('animal', 'blog_post');
  CREATE TYPE "public"."enum_comments_status" AS ENUM('published', 'hidden', 'reported');
  CREATE TYPE "public"."enum_report_flags_target_type" AS ENUM('animal', 'comment', 'organization');
  CREATE TYPE "public"."enum_report_flags_status" AS ENUM('new', 'in_progress', 'closed');
  CREATE TABLE "comments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"author_id" integer NOT NULL,
  	"target_type" "enum_comments_target_type" NOT NULL,
  	"target_id" varchar NOT NULL,
  	"body" varchar NOT NULL,
  	"parent_id" integer,
  	"status" "enum_comments_status" DEFAULT 'published',
  	"spam_score" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "report_flags" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"reporter_id" integer,
  	"target_type" "enum_report_flags_target_type" NOT NULL,
  	"target_id" varchar NOT NULL,
  	"reason" varchar NOT NULL,
  	"status" "enum_report_flags_status" DEFAULT 'new',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "comments_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "report_flags_id" integer;
  ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "report_flags" ADD CONSTRAINT "report_flags_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "comments_author_idx" ON "comments" USING btree ("author_id");
  CREATE INDEX "comments_target_type_idx" ON "comments" USING btree ("target_type");
  CREATE INDEX "comments_target_id_idx" ON "comments" USING btree ("target_id");
  CREATE INDEX "comments_parent_idx" ON "comments" USING btree ("parent_id");
  CREATE INDEX "comments_status_idx" ON "comments" USING btree ("status");
  CREATE INDEX "comments_updated_at_idx" ON "comments" USING btree ("updated_at");
  CREATE INDEX "comments_created_at_idx" ON "comments" USING btree ("created_at");
  CREATE INDEX "report_flags_reporter_idx" ON "report_flags" USING btree ("reporter_id");
  CREATE INDEX "report_flags_target_id_idx" ON "report_flags" USING btree ("target_id");
  CREATE INDEX "report_flags_status_idx" ON "report_flags" USING btree ("status");
  CREATE INDEX "report_flags_updated_at_idx" ON "report_flags" USING btree ("updated_at");
  CREATE INDEX "report_flags_created_at_idx" ON "report_flags" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_comments_fk" FOREIGN KEY ("comments_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_report_flags_fk" FOREIGN KEY ("report_flags_id") REFERENCES "public"."report_flags"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_comments_id_idx" ON "payload_locked_documents_rels" USING btree ("comments_id");
  CREATE INDEX "payload_locked_documents_rels_report_flags_id_idx" ON "payload_locked_documents_rels" USING btree ("report_flags_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "comments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "report_flags" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "comments" CASCADE;
  DROP TABLE "report_flags" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_comments_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_report_flags_fk";
  
  DROP INDEX "payload_locked_documents_rels_comments_id_idx";
  DROP INDEX "payload_locked_documents_rels_report_flags_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "comments_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "report_flags_id";
  DROP TYPE "public"."enum_comments_target_type";
  DROP TYPE "public"."enum_comments_status";
  DROP TYPE "public"."enum_report_flags_target_type";
  DROP TYPE "public"."enum_report_flags_status";`)
}
