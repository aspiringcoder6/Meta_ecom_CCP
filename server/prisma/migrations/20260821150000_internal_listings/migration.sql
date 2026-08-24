-- Campaign-specific fields shown and edited in Internal Listings.
ALTER TABLE "CampaignCreator"
ADD COLUMN "quotedCost" DECIMAL(18,2),
ADD COLUMN "quotedExtraCost" DECIMAL(18,2),
ADD COLUMN "scope" TEXT,
ADD COLUMN "pic" TEXT;
