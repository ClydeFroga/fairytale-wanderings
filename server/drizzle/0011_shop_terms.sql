CREATE TABLE "shop_terms" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"payment_text" text DEFAULT '' NOT NULL,
	"delivery_text" text DEFAULT '' NOT NULL,
	"returns_text" text DEFAULT '' NOT NULL,
	"offer" jsonb,
	"privacy" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shop_terms_single_row" CHECK ("shop_terms"."id" = 1)
);
