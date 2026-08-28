ALTER TABLE "products" ADD COLUMN "slug" text;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION tmp_product_slugify(value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  s text;
  ch text;
  mapped text;
  out text := '';
  i int;
BEGIN
  s := lower(trim(both from value));
  FOR i IN 1..char_length(s) LOOP
    ch := substr(s, i, 1);
    mapped := CASE ch
      WHEN 'а' THEN 'a' WHEN 'б' THEN 'b' WHEN 'в' THEN 'v' WHEN 'г' THEN 'g'
      WHEN 'д' THEN 'd' WHEN 'е' THEN 'e' WHEN 'ё' THEN 'e' WHEN 'ж' THEN 'zh'
      WHEN 'з' THEN 'z' WHEN 'и' THEN 'i' WHEN 'й' THEN 'i' WHEN 'к' THEN 'k'
      WHEN 'л' THEN 'l' WHEN 'м' THEN 'm' WHEN 'н' THEN 'n' WHEN 'о' THEN 'o'
      WHEN 'п' THEN 'p' WHEN 'р' THEN 'r' WHEN 'с' THEN 's' WHEN 'т' THEN 't'
      WHEN 'у' THEN 'u' WHEN 'ф' THEN 'f' WHEN 'х' THEN 'h' WHEN 'ц' THEN 'c'
      WHEN 'ч' THEN 'ch' WHEN 'ш' THEN 'sh' WHEN 'щ' THEN 'sch' WHEN 'ъ' THEN ''
      WHEN 'ы' THEN 'y' WHEN 'ь' THEN '' WHEN 'э' THEN 'e' WHEN 'ю' THEN 'yu'
      WHEN 'я' THEN 'ya'
      ELSE ch
    END;
    out := out || mapped;
  END LOOP;
  out := regexp_replace(out, '[^a-z0-9]+', '-', 'g');
  out := left(out, 60);
  out := regexp_replace(out, '^-+|-+$', '', 'g');
  RETURN out;
END;
$$;
--> statement-breakpoint
DO $backfill$
DECLARE
  product_row record;
  base_slug text;
  candidate_slug text;
  suffix integer;
BEGIN
  CREATE TEMP TABLE tmp_product_used_slugs (
    slug text PRIMARY KEY
  ) ON COMMIT DROP;

  FOR product_row IN SELECT id, name FROM products ORDER BY id LOOP
    base_slug := COALESCE(NULLIF(tmp_product_slugify(product_row.name), ''), 'product');
    candidate_slug := base_slug;
    suffix := 2;

    WHILE EXISTS (
      SELECT 1 FROM tmp_product_used_slugs WHERE slug = candidate_slug
    ) LOOP
      candidate_slug := base_slug || '-' || suffix::text;
      suffix := suffix + 1;
    END LOOP;

    UPDATE products SET slug = candidate_slug WHERE id = product_row.id;
    INSERT INTO tmp_product_used_slugs (slug) VALUES (candidate_slug);
  END LOOP;
END;
$backfill$;
--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "slug" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_slug_unique" UNIQUE("slug");
--> statement-breakpoint
DROP FUNCTION tmp_product_slugify(text);