ALTER TABLE "Creator"
ADD COLUMN "concept" TEXT,
ADD COLUMN "productFocus" TEXT,
ALTER COLUMN "historicalCampaign" SET DEFAULT 'Đã hợp tác';

UPDATE "Creator"
SET "historicalCampaign" = 'Đã hợp tác'
WHERE BTRIM("historicalCampaign") = '';
