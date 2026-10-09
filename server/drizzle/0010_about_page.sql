CREATE TABLE "about_page" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "about_page_single_row" CHECK ("about_page"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "seller_info" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"full_name" text DEFAULT '' NOT NULL,
	"inn" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seller_info_single_row" CHECK ("seller_info"."id" = 1)
);
