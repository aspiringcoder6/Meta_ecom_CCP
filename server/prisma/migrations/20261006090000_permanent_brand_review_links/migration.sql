-- Keep every previously shared token intact, including older links for the same campaign.
ALTER TABLE "ReviewLink" ALTER COLUMN "expiresAt" DROP NOT NULL;

-- A deliberately revoked link stays revoked. All other Brand Review links have no expiry.
UPDATE "ReviewLink" SET "expiresAt" = NULL WHERE "revoked" = false;
