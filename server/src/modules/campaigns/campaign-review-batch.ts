import { Prisma } from '../../../generated/prisma/client.js'
import { ApiError } from '../../utils/api-error.js'

export const REVIEW_TRANSACTION_OPTIONS = { maxWait: 5_000, timeout: 15_000 }

const reviewCreatorSelect = {
  id: true, creatorId: true, clientDecision: true, clientNote: true, brandProducts: true,
  deliverablesData: true, creatorConfirmed: true, status: true, clientChangedAt: true, clientChangeUnread: true,
} satisfies Prisma.CampaignCreatorSelect

type ReviewCreator = Prisma.CampaignCreatorGetPayload<{ select: typeof reviewCreatorSelect }>

export type ReviewCreatorPatch = {
  id: string
  clientDecision?: string
  status?: string
  clientNote?: string
  brandProducts?: string[]
  deliverablesData?: Prisma.InputJsonValue
}

export async function lockReviewCreators(tx: Prisma.TransactionClient, campaignId: string, creatorIds: string[]) {
  const ids = [...new Set(creatorIds)]
  if (!ids.length) return new Map<string, ReviewCreator>()
  // Lock the entire batch in a deterministic order, then read fresh values once.
  await tx.$queryRaw(Prisma.sql`
    SELECT "id" FROM "CampaignCreator"
    WHERE "campaignId" = ${campaignId} AND "creatorId" IN (${Prisma.join(ids)})
    ORDER BY "id" FOR UPDATE
  `)
  const creators = await tx.campaignCreator.findMany({
    where: { campaignId, creatorId: { in: ids } }, select: reviewCreatorSelect,
  })
  return new Map(creators.map((creator) => [creator.creatorId, creator]))
}

export async function updateReviewCreators(tx: Prisma.TransactionClient, campaignId: string, patches: ReviewCreatorPatch[], changedAt: Date) {
  if (!patches.length) return
  const rows = patches.map((patch) => ({
    ...patch,
    decisionChanged: patch.clientDecision !== undefined,
    noteChanged: patch.clientNote !== undefined,
    productsChanged: patch.brandProducts !== undefined,
    deliverablesChanged: patch.deliverablesData !== undefined,
  }))
  // One parameterized UPDATE for the batch, rather than hundreds of network round trips.
  // Flags preserve columns not changed by Brand (including edits made by the team).
  const updated = await tx.$executeRaw(Prisma.sql`
    UPDATE "CampaignCreator" AS creator
    SET "clientDecision" = CASE WHEN patch."decisionChanged" THEN patch."clientDecision" ELSE creator."clientDecision" END,
        "status" = CASE WHEN patch."decisionChanged" THEN patch."status" ELSE creator."status" END,
        "clientNote" = CASE WHEN patch."noteChanged" THEN patch."clientNote" ELSE creator."clientNote" END,
        "brandProducts" = CASE WHEN patch."productsChanged" THEN ARRAY(SELECT jsonb_array_elements_text(patch."brandProducts")) ELSE creator."brandProducts" END,
        "deliverablesData" = CASE WHEN patch."deliverablesChanged" THEN patch."deliverablesData" ELSE creator."deliverablesData" END,
        "clientChangedAt" = ${changedAt}, "clientChangeUnread" = true
    FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS patch(
      "id" text, "clientDecision" text, "status" text, "clientNote" text,
      "brandProducts" jsonb, "deliverablesData" jsonb,
      "decisionChanged" boolean, "noteChanged" boolean, "productsChanged" boolean, "deliverablesChanged" boolean
    )
    WHERE creator."campaignId" = ${campaignId} AND creator."id" = patch."id"
  `)
  if (updated !== patches.length) throw new ApiError(409, 'Danh sách KOC vừa thay đổi. Vui lòng tải lại rồi gửi phản hồi.', 'REVIEW_BATCH_CONFLICT')
}
