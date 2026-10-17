import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/api-error.js'

export async function brandCampaign(token: string, database = prisma) {
  const link = await database.reviewLink.findUnique({ where: { token }, select: {
    id: true, revoked: true, campaignId: true, campaign: { select: {
      id: true, externalId: true, name: true, client: true, description: true, startDate: true,
      endDate: true, status: true, updatedAt: true, defaultDeliverables: true,
    } },
  } })
  if (!link || link.revoked) throw new ApiError(404, 'Link review không hợp lệ hoặc đã bị thu hồi.', 'REVIEW_LINK_INVALID')
  return link
}

export async function staffCampaign(identifier: string, database = prisma) {
  const campaign = await database.campaign.findFirst({ where: { OR: [{ id: identifier }, { externalId: identifier }] }, select: { id: true, externalId: true, name: true, client: true } })
  if (!campaign) throw new ApiError(404, 'Không tìm thấy Campaign.', 'CAMPAIGN_NOT_FOUND')
  return campaign
}
