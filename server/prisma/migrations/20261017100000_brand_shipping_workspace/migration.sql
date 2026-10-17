ALTER TABLE "CampaignCreator" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Track real changes, including the existing parameterized bulk UPDATE path.
-- Reading/clearing unread highlights must not invalidate every open screen.
CREATE FUNCTION bump_campaign_creator_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (to_jsonb(NEW) - 'revision' - 'updatedAt' - 'clientChangeUnread' - 'clientChangedAt')
    IS DISTINCT FROM (to_jsonb(OLD) - 'revision' - 'updatedAt' - 'clientChangeUnread' - 'clientChangedAt') THEN
    NEW."revision" := OLD."revision" + 1;
    NEW."updatedAt" := CURRENT_TIMESTAMP;
  ELSE
    NEW."revision" := OLD."revision";
    NEW."updatedAt" := OLD."updatedAt";
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER campaign_creator_revision BEFORE UPDATE ON "CampaignCreator"
  FOR EACH ROW EXECUTE FUNCTION bump_campaign_creator_revision();

CREATE TABLE "CampaignShipment" (
  "id" TEXT PRIMARY KEY,
  "campaignCreatorId" TEXT NOT NULL REFERENCES "CampaignCreator"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "items" JSONB NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'NOT_SENT',
  "carrier" TEXT NOT NULL DEFAULT '', "trackingCode" TEXT NOT NULL DEFAULT '',
  "sentDate" TEXT NOT NULL DEFAULT '', "expectedDate" TEXT NOT NULL DEFAULT '', "receivedDate" TEXT NOT NULL DEFAULT '',
  "note" TEXT NOT NULL DEFAULT '', "teamReceipt" TEXT NOT NULL DEFAULT 'UNCONFIRMED',
  "confirmedBy" TEXT NOT NULL DEFAULT '', "confirmedAt" TIMESTAMP(3),
  "revision" INTEGER NOT NULL DEFAULT 1, "lastBrandRevision" INTEGER NOT NULL DEFAULT 0, "updatedBy" TEXT NOT NULL, "updatedByType" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "CampaignShipment_campaignCreatorId_updatedAt_idx" ON "CampaignShipment"("campaignCreatorId", "updatedAt");
CREATE TABLE "ShipmentEvent" (
  "id" TEXT PRIMARY KEY, "shipmentId" TEXT NOT NULL REFERENCES "CampaignShipment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "actor" TEXT NOT NULL, "actorType" TEXT NOT NULL, "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ShipmentEvent_shipmentId_createdAt_idx" ON "ShipmentEvent"("shipmentId", "createdAt");
CREATE TABLE "ShipmentRead" (
  "shipmentId" TEXT NOT NULL REFERENCES "CampaignShipment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "brandRevision" INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("shipmentId", "userId")
);
CREATE INDEX "ShipmentRead_userId_idx" ON "ShipmentRead"("userId");
