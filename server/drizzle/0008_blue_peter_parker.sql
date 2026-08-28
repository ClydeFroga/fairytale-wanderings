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
WITH ranked AS (
  SELECT
    id,
    COALESCE(NULLIF(tmp_product_slugify(name), ''), 'product') AS base_slug,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(NULLIF(tmp_product_slugify(name), ''), 'product')
      ORDER BY id
    ) AS rn
  FROM products
)
UPDATE products AS p
SET slug = CASE
  WHEN r.rn = 1 THEN r.base_slug
  ELSE r.base_slug || '-' || r.rn::text
END
FROM ranked AS r
WHERE p.id = r.id;
--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "slug" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_slug_unique" UNIQUE("slug");
--> statement-breakpoint
DROP FUNCTION tmp_product_slugify(text);