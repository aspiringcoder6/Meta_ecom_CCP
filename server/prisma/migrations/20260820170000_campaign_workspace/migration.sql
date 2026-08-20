ALTER TABLE "Campaign"
  ADD COLUMN "externalId" TEXT,
  ADD COLUMN "owner" TEXT NOT NULL DEFAULT 'Chưa gán',
  ADD COLUMN "creatorBudget" DECIMAL(18,2),
  ADD COLUMN "defaultDeliverables" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "lastClientReviewAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Campaign" SET "externalId" = 'CMP-LEGACY-' || "id" WHERE "externalId" IS NULL;
ALTER TABLE "Campaign" ALTER COLUMN "externalId" SET NOT NULL;
ALTER TABLE "Campaign" ALTER COLUMN "budget" TYPE DECIMAL(18,2);
ALTER TABLE "Campaign" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "CampaignCreator"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PROPOSED',
  ADD COLUMN "suggestedPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "actualPrice" DECIMAL(18,2),
  ADD COLUMN "deliverablesData" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "clientDecision" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "clientNote" TEXT,
  ADD COLUMN "clientChangedAt" TIMESTAMP(3),
  ADD COLUMN "clientChangeUnread" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "creatorConfirmed" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Milestone"
  ADD COLUMN "owner" TEXT NOT NULL DEFAULT 'Chưa gán',
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'UPCOMING';

ALTER TABLE "ClientFeedback" ADD COLUMN "campaignCreatorId" TEXT;

ALTER TABLE "Notification"
  ADD COLUMN "campaignId" TEXT,
  ADD COLUMN "detail" TEXT,
  ADD COLUMN "icon" TEXT NOT NULL DEFAULT 'bell',
  ADD COLUMN "href" TEXT;

CREATE UNIQUE INDEX "Campaign_externalId_key" ON "Campaign"("externalId");
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");
CREATE INDEX "Campaign_client_idx" ON "Campaign"("client");
UPDATE "Deliverable" deliverable
SET "campaignCreatorId" = canonical."keeperId"
FROM "CampaignCreator" duplicate
JOIN (
  SELECT "campaignId", "creatorId", MIN("id") AS "keeperId"
  FROM "CampaignCreator"
  GROUP BY "campaignId", "creatorId"
  HAVING COUNT(*) > 1
) canonical
  ON duplicate."campaignId" = canonical."campaignId"
 AND duplicate."creatorId" = canonical."creatorId"
WHERE deliverable."campaignCreatorId" = duplicate."id"
  AND duplicate."id" <> canonical."keeperId";
DELETE FROM "CampaignCreator" duplicate
USING (
  SELECT "campaignId", "creatorId", MIN("id") AS "keeperId"
  FROM "CampaignCreator"
  GROUP BY "campaignId", "creatorId"
  HAVING COUNT(*) > 1
) canonical
WHERE duplicate."campaignId" = canonical."campaignId"
  AND duplicate."creatorId" = canonical."creatorId"
  AND duplicate."id" <> canonical."keeperId";
CREATE UNIQUE INDEX "CampaignCreator_campaignId_creatorId_key" ON "CampaignCreator"("campaignId", "creatorId");
CREATE INDEX "CampaignCreator_campaignId_clientChangeUnread_idx" ON "CampaignCreator"("campaignId", "clientChangeUnread");
CREATE INDEX "Milestone_dueDate_status_idx" ON "Milestone"("dueDate", "status");
CREATE INDEX "ReviewLink_campaignId_revoked_idx" ON "ReviewLink"("campaignId", "revoked");
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");

ALTER TABLE "CampaignCreator" DROP CONSTRAINT "CampaignCreator_campaignId_fkey";
ALTER TABLE "CampaignCreator" ADD CONSTRAINT "CampaignCreator_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deliverable" DROP CONSTRAINT "Deliverable_campaignCreatorId_fkey";
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_campaignCreatorId_fkey" FOREIGN KEY ("campaignCreatorId") REFERENCES "CampaignCreator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Milestone" DROP CONSTRAINT "Milestone_campaignId_fkey";
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientFeedback" DROP CONSTRAINT "ClientFeedback_reviewLinkId_fkey";
ALTER TABLE "ClientFeedback" ADD CONSTRAINT "ClientFeedback_reviewLinkId_fkey" FOREIGN KEY ("reviewLinkId") REFERENCES "ReviewLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewLink" ADD CONSTRAINT "ReviewLink_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientFeedback" ADD CONSTRAINT "ClientFeedback_campaignCreatorId_fkey" FOREIGN KEY ("campaignCreatorId") REFERENCES "CampaignCreator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
