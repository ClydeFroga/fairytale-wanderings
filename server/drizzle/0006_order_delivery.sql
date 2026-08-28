ALTER TABLE "orders" ADD COLUMN "delivery_point_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_tariff_code" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_price" integer;