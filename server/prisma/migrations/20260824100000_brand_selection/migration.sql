ALTER TABLE "CampaignCreator"
ADD COLUMN "metaEcomNote" TEXT,
ADD COLUMN "kocDecision" TEXT NOT NULL DEFAULT 'PENDING';

UPDATE "CampaignCreator"
SET "kocDecision" = 'APPROVED'
WHERE "creatorConfirmed" = TRUE;
