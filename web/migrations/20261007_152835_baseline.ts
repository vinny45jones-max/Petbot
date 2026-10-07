import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('guest', 'citizen', 'org_admin', 'moderator', 'superadmin');
  CREATE TYPE "public"."enum_cities_region" AS ENUM('Минская', 'Брестская', 'Витебская', 'Гомельская', 'Гродненская', 'Могилёвская');
  CREATE TYPE "public"."enum_media_media_kind" AS ENUM('image', 'video');
  CREATE TYPE "public"."enum_animals_species" AS ENUM('dog', 'cat', 'other');
  CREATE TYPE "public"."enum_animals_sex" AS ENUM('male', 'female', 'unknown');
  CREATE TYPE "public"."enum_animals_size" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "public"."enum_animals_health_status" AS ENUM('healthy', 'needs_treatment', 'chronic_condition', 'recovering', 'unknown');
  CREATE TYPE "public"."enum_animals_owner_type" AS ENUM('citizen', 'organization');
  CREATE TYPE "public"."enum_animals_status" AS ENUM('pending_review', 'published', 'adopted', 'archived');
  CREATE TYPE "public"."enum_animals_source" AS ENUM('web_form', 'telegram_bot', 'partner_feed', 'admin');
  CREATE TYPE "public"."enum_animals_lost_or_found" AS ENUM('none', 'lost', 'found');
  CREATE TYPE "public"."enum_animals_urgency_level" AS ENUM('normal', 'high', 'critical');
  CREATE TYPE "public"."enum_adoption_inquiries_status" AS ENUM('new', 'contacted', 'closed');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"first_name" varchar,
  	"last_name" varchar,
  	"photo_url" varchar,
  	"phone" varchar,
  	"telegram_id" varchar,
  	"telegram_username" varchar,
  	"role" "enum_users_role" DEFAULT 'citizen' NOT NULL,
  	"is_blocked" boolean DEFAULT false,
  	"last_seen_at" timestamp(3) with time zone,
  	"age_confirmed" boolean DEFAULT false NOT NULL,
  	"consent_personal_data" boolean DEFAULT false NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"_verified" boolean,
  	"_verificationtoken" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "cities" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name_ru" varchar NOT NULL,
  	"name_be" varchar NOT NULL,
  	"region" "enum_cities_region" NOT NULL,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"media_kind" "enum_media_media_kind" DEFAULT 'image' NOT NULL,
  	"uploaded_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumb_url" varchar,
  	"sizes_thumb_width" numeric,
  	"sizes_thumb_height" numeric,
  	"sizes_thumb_mime_type" varchar,
  	"sizes_thumb_filesize" numeric,
  	"sizes_thumb_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_detail_url" varchar,
  	"sizes_detail_width" numeric,
  	"sizes_detail_height" numeric,
  	"sizes_detail_mime_type" varchar,
  	"sizes_detail_filesize" numeric,
  	"sizes_detail_filename" varchar
  );
  
  CREATE TABLE "audit_logs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"actor_id" integer,
  	"action" varchar NOT NULL,
  	"target_type" varchar NOT NULL,
  	"target_id" varchar NOT NULL,
  	"meta" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "notification_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"email_adoption_inquiry" boolean DEFAULT true,
  	"email_moderation_result" boolean DEFAULT true,
  	"email_donation_receipt" boolean DEFAULT true,
  	"email_weekly_digest" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "notification_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"cities_id" integer
  );
  
  CREATE TABLE "magic_link_tokens" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"token_hash" varchar NOT NULL,
  	"user_id" integer NOT NULL,
  	"consumed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "organizations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar,
  	"unp" varchar,
  	"description" jsonb,
  	"logo_id" integer,
  	"cover_photo_id" integer,
  	"city_id" integer,
  	"address" varchar,
  	"phone" varchar,
  	"email" varchar,
  	"tg_url" varchar,
  	"viber_url" varchar,
  	"vk_url" varchar,
  	"instagram_url" varchar,
  	"website_url" varchar,
  	"donation_bank_details" jsonb,
  	"erip_service_code" varchar,
  	"is_verified" boolean DEFAULT false,
  	"is_published" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "organizations_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "intake_facilities" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar,
  	"city_id" integer,
  	"address" varchar,
  	"phone" varchar,
  	"email" varchar,
  	"legal_hold_days" numeric DEFAULT 5 NOT NULL,
  	"description" jsonb,
  	"contact_tg_url" varchar,
  	"viber_url" varchar,
  	"is_municipal" boolean DEFAULT true,
  	"is_published" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "animals" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"pet_number" numeric,
  	"slug" varchar,
  	"species" "enum_animals_species" NOT NULL,
  	"sex" "enum_animals_sex" DEFAULT 'unknown',
  	"age_years" numeric,
  	"age_months" numeric,
  	"size" "enum_animals_size",
  	"description" jsonb,
  	"description_plain" varchar,
  	"health_status" "enum_animals_health_status" DEFAULT 'healthy',
  	"health_notes" jsonb,
  	"is_sterilized" boolean DEFAULT false,
  	"is_vaccinated" boolean DEFAULT false,
  	"microchip_id" varchar,
  	"city_id" integer,
  	"owner_type" "enum_animals_owner_type" DEFAULT 'citizen' NOT NULL,
  	"owner_user_id" integer,
  	"organization_id" integer,
  	"status" "enum_animals_status" DEFAULT 'pending_review' NOT NULL,
  	"source" "enum_animals_source" DEFAULT 'web_form',
  	"lost_or_found" "enum_animals_lost_or_found" DEFAULT 'none',
  	"intake_facility_id" integer,
  	"intake_date" timestamp(3) with time zone,
  	"legal_deadline_date" timestamp(3) with time zone,
  	"urgency_level" "enum_animals_urgency_level" DEFAULT 'normal',
  	"urgency_rank" numeric DEFAULT 0,
  	"published_at" timestamp(3) with time zone,
  	"adopted_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "animals_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "adoption_inquiries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"animal_id" integer NOT NULL,
  	"applicant_id" integer NOT NULL,
  	"message" varchar NOT NULL,
  	"contact_phone" varchar,
  	"contact_telegram" varchar,
  	"status" "enum_adoption_inquiries_status" DEFAULT 'new',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"cities_id" integer,
  	"media_id" integer,
  	"audit_logs_id" integer,
  	"notification_preferences_id" integer,
  	"magic_link_tokens_id" integer,
  	"organizations_id" integer,
  	"intake_facilities_id" integer,
  	"animals_id" integer,
  	"adoption_inquiries_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "notification_preferences_rels" ADD CONSTRAINT "notification_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."notification_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "notification_preferences_rels" ADD CONSTRAINT "notification_preferences_rels_cities_fk" FOREIGN KEY ("cities_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "magic_link_tokens" ADD CONSTRAINT "magic_link_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "organizations" ADD CONSTRAINT "organizations_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "organizations" ADD CONSTRAINT "organizations_cover_photo_id_media_id_fk" FOREIGN KEY ("cover_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "organizations" ADD CONSTRAINT "organizations_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "organizations_rels" ADD CONSTRAINT "organizations_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "organizations_rels" ADD CONSTRAINT "organizations_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "intake_facilities" ADD CONSTRAINT "intake_facilities_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "animals" ADD CONSTRAINT "animals_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "animals" ADD CONSTRAINT "animals_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "animals" ADD CONSTRAINT "animals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "animals" ADD CONSTRAINT "animals_intake_facility_id_intake_facilities_id_fk" FOREIGN KEY ("intake_facility_id") REFERENCES "public"."intake_facilities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "animals_rels" ADD CONSTRAINT "animals_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."animals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "animals_rels" ADD CONSTRAINT "animals_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "adoption_inquiries" ADD CONSTRAINT "adoption_inquiries_animal_id_animals_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animals"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "adoption_inquiries" ADD CONSTRAINT "adoption_inquiries_applicant_id_users_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cities_fk" FOREIGN KEY ("cities_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_logs_fk" FOREIGN KEY ("audit_logs_id") REFERENCES "public"."audit_logs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_notification_preferences_fk" FOREIGN KEY ("notification_preferences_id") REFERENCES "public"."notification_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_magic_link_tokens_fk" FOREIGN KEY ("magic_link_tokens_id") REFERENCES "public"."magic_link_tokens"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_organizations_fk" FOREIGN KEY ("organizations_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_intake_facilities_fk" FOREIGN KEY ("intake_facilities_id") REFERENCES "public"."intake_facilities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_animals_fk" FOREIGN KEY ("animals_id") REFERENCES "public"."animals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_adoption_inquiries_fk" FOREIGN KEY ("adoption_inquiries_id") REFERENCES "public"."adoption_inquiries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "users_telegram_id_idx" ON "users" USING btree ("telegram_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "cities_name_ru_idx" ON "cities" USING btree ("name_ru");
  CREATE UNIQUE INDEX "cities_slug_idx" ON "cities" USING btree ("slug");
  CREATE INDEX "cities_updated_at_idx" ON "cities" USING btree ("updated_at");
  CREATE INDEX "cities_created_at_idx" ON "cities" USING btree ("created_at");
  CREATE INDEX "media_uploaded_by_idx" ON "media" USING btree ("uploaded_by_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumb_sizes_thumb_filename_idx" ON "media" USING btree ("sizes_thumb_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_detail_sizes_detail_filename_idx" ON "media" USING btree ("sizes_detail_filename");
  CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id");
  CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");
  CREATE INDEX "audit_logs_target_type_idx" ON "audit_logs" USING btree ("target_type");
  CREATE INDEX "audit_logs_target_id_idx" ON "audit_logs" USING btree ("target_id");
  CREATE INDEX "audit_logs_updated_at_idx" ON "audit_logs" USING btree ("updated_at");
  CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");
  CREATE UNIQUE INDEX "notification_preferences_user_idx" ON "notification_preferences" USING btree ("user_id");
  CREATE INDEX "notification_preferences_updated_at_idx" ON "notification_preferences" USING btree ("updated_at");
  CREATE INDEX "notification_preferences_created_at_idx" ON "notification_preferences" USING btree ("created_at");
  CREATE INDEX "notification_preferences_rels_order_idx" ON "notification_preferences_rels" USING btree ("order");
  CREATE INDEX "notification_preferences_rels_parent_idx" ON "notification_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "notification_preferences_rels_path_idx" ON "notification_preferences_rels" USING btree ("path");
  CREATE INDEX "notification_preferences_rels_cities_id_idx" ON "notification_preferences_rels" USING btree ("cities_id");
  CREATE UNIQUE INDEX "magic_link_tokens_token_hash_idx" ON "magic_link_tokens" USING btree ("token_hash");
  CREATE INDEX "magic_link_tokens_user_idx" ON "magic_link_tokens" USING btree ("user_id");
  CREATE INDEX "magic_link_tokens_updated_at_idx" ON "magic_link_tokens" USING btree ("updated_at");
  CREATE INDEX "magic_link_tokens_created_at_idx" ON "magic_link_tokens" USING btree ("created_at");
  CREATE INDEX "organizations_name_idx" ON "organizations" USING btree ("name");
  CREATE UNIQUE INDEX "organizations_slug_idx" ON "organizations" USING btree ("slug");
  CREATE INDEX "organizations_logo_idx" ON "organizations" USING btree ("logo_id");
  CREATE INDEX "organizations_cover_photo_idx" ON "organizations" USING btree ("cover_photo_id");
  CREATE INDEX "organizations_city_idx" ON "organizations" USING btree ("city_id");
  CREATE INDEX "organizations_updated_at_idx" ON "organizations" USING btree ("updated_at");
  CREATE INDEX "organizations_created_at_idx" ON "organizations" USING btree ("created_at");
  CREATE INDEX "organizations_rels_order_idx" ON "organizations_rels" USING btree ("order");
  CREATE INDEX "organizations_rels_parent_idx" ON "organizations_rels" USING btree ("parent_id");
  CREATE INDEX "organizations_rels_path_idx" ON "organizations_rels" USING btree ("path");
  CREATE INDEX "organizations_rels_users_id_idx" ON "organizations_rels" USING btree ("users_id");
  CREATE INDEX "intake_facilities_name_idx" ON "intake_facilities" USING btree ("name");
  CREATE UNIQUE INDEX "intake_facilities_slug_idx" ON "intake_facilities" USING btree ("slug");
  CREATE INDEX "intake_facilities_city_idx" ON "intake_facilities" USING btree ("city_id");
  CREATE INDEX "intake_facilities_updated_at_idx" ON "intake_facilities" USING btree ("updated_at");
  CREATE INDEX "intake_facilities_created_at_idx" ON "intake_facilities" USING btree ("created_at");
  CREATE INDEX "animals_name_idx" ON "animals" USING btree ("name");
  CREATE UNIQUE INDEX "animals_pet_number_idx" ON "animals" USING btree ("pet_number");
  CREATE UNIQUE INDEX "animals_slug_idx" ON "animals" USING btree ("slug");
  CREATE INDEX "animals_species_idx" ON "animals" USING btree ("species");
  CREATE INDEX "animals_city_idx" ON "animals" USING btree ("city_id");
  CREATE INDEX "animals_owner_type_idx" ON "animals" USING btree ("owner_type");
  CREATE INDEX "animals_owner_user_idx" ON "animals" USING btree ("owner_user_id");
  CREATE INDEX "animals_organization_idx" ON "animals" USING btree ("organization_id");
  CREATE INDEX "animals_status_idx" ON "animals" USING btree ("status");
  CREATE INDEX "animals_lost_or_found_idx" ON "animals" USING btree ("lost_or_found");
  CREATE INDEX "animals_intake_facility_idx" ON "animals" USING btree ("intake_facility_id");
  CREATE INDEX "animals_legal_deadline_date_idx" ON "animals" USING btree ("legal_deadline_date");
  CREATE INDEX "animals_urgency_level_idx" ON "animals" USING btree ("urgency_level");
  CREATE INDEX "animals_urgency_rank_idx" ON "animals" USING btree ("urgency_rank");
  CREATE INDEX "animals_updated_at_idx" ON "animals" USING btree ("updated_at");
  CREATE INDEX "animals_created_at_idx" ON "animals" USING btree ("created_at");
  CREATE INDEX "animals_rels_order_idx" ON "animals_rels" USING btree ("order");
  CREATE INDEX "animals_rels_parent_idx" ON "animals_rels" USING btree ("parent_id");
  CREATE INDEX "animals_rels_path_idx" ON "animals_rels" USING btree ("path");
  CREATE INDEX "animals_rels_media_id_idx" ON "animals_rels" USING btree ("media_id");
  CREATE INDEX "adoption_inquiries_animal_idx" ON "adoption_inquiries" USING btree ("animal_id");
  CREATE INDEX "adoption_inquiries_applicant_idx" ON "adoption_inquiries" USING btree ("applicant_id");
  CREATE INDEX "adoption_inquiries_status_idx" ON "adoption_inquiries" USING btree ("status");
  CREATE INDEX "adoption_inquiries_updated_at_idx" ON "adoption_inquiries" USING btree ("updated_at");
  CREATE INDEX "adoption_inquiries_created_at_idx" ON "adoption_inquiries" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_cities_id_idx" ON "payload_locked_documents_rels" USING btree ("cities_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_audit_logs_id_idx" ON "payload_locked_documents_rels" USING btree ("audit_logs_id");
  CREATE INDEX "payload_locked_documents_rels_notification_preferences_i_idx" ON "payload_locked_documents_rels" USING btree ("notification_preferences_id");
  CREATE INDEX "payload_locked_documents_rels_magic_link_tokens_id_idx" ON "payload_locked_documents_rels" USING btree ("magic_link_tokens_id");
  CREATE INDEX "payload_locked_documents_rels_organizations_id_idx" ON "payload_locked_documents_rels" USING btree ("organizations_id");
  CREATE INDEX "payload_locked_documents_rels_intake_facilities_id_idx" ON "payload_locked_documents_rels" USING btree ("intake_facilities_id");
  CREATE INDEX "payload_locked_documents_rels_animals_id_idx" ON "payload_locked_documents_rels" USING btree ("animals_id");
  CREATE INDEX "payload_locked_documents_rels_adoption_inquiries_id_idx" ON "payload_locked_documents_rels" USING btree ("adoption_inquiries_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "cities" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "audit_logs" CASCADE;
  DROP TABLE "notification_preferences" CASCADE;
  DROP TABLE "notification_preferences_rels" CASCADE;
  DROP TABLE "magic_link_tokens" CASCADE;
  DROP TABLE "organizations" CASCADE;
  DROP TABLE "organizations_rels" CASCADE;
  DROP TABLE "intake_facilities" CASCADE;
  DROP TABLE "animals" CASCADE;
  DROP TABLE "animals_rels" CASCADE;
  DROP TABLE "adoption_inquiries" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_cities_region";
  DROP TYPE "public"."enum_media_media_kind";
  DROP TYPE "public"."enum_animals_species";
  DROP TYPE "public"."enum_animals_sex";
  DROP TYPE "public"."enum_animals_size";
  DROP TYPE "public"."enum_animals_health_status";
  DROP TYPE "public"."enum_animals_owner_type";
  DROP TYPE "public"."enum_animals_status";
  DROP TYPE "public"."enum_animals_source";
  DROP TYPE "public"."enum_animals_lost_or_found";
  DROP TYPE "public"."enum_animals_urgency_level";
  DROP TYPE "public"."enum_adoption_inquiries_status";`)
}
