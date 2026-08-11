DROP INDEX IF EXISTS "Creator_category_idx";

ALTER TABLE "Creator"
ALTER COLUMN "category" TYPE TEXT[]
USING CASE
  WHEN "category" IS NULL OR BTRIM("category") = '' THEN ARRAY['BEAUTY']::TEXT[]
  ELSE ARRAY["category"]::TEXT[]
END,
ALTER COLUMN "category" SET DEFAULT ARRAY['BEAUTY']::TEXT[],
ALTER COLUMN "category" SET NOT NULL,
ALTER COLUMN "type" TYPE TEXT[]
USING CASE
  WHEN "type" IS NULL OR BTRIM("type") = '' THEN ARRAY['VIDEO']::TEXT[]
  WHEN "type" = 'VIDEO / LIVESTREAM' THEN ARRAY['VIDEO', 'LIVESTREAM']::TEXT[]
  ELSE ARRAY["type"]::TEXT[]
END,
ALTER COLUMN "type" SET DEFAULT ARRAY['VIDEO']::TEXT[],
ALTER COLUMN "type" SET NOT NULL;

CREATE INDEX "Creator_category_idx" ON "Creator" USING GIN ("category");
CREATE INDEX "Creator_type_idx" ON "Creator" USING GIN ("type");
