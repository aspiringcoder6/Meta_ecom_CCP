import { randomUUID } from 'node:crypto'
import { Prisma } from '../../../generated/prisma/client.js'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/api-error.js'
import { calculateBookingPricing } from '../../utils/pricing.js'

const campaignInclude = {
  creators: { include: { creator: true }, orderBy: { id: 'asc' as const } },
  milestones: { orderBy: { dueDate: 'asc' as const } },
  reviewLinks: { where: { revoked: false }, orderBy: { createdAt: 'desc' as const }, take: 1 },
} as const

type CampaignRecord = Awaited<ReturnType<typeof prisma.campaign.findFirstOrThrow<{ include: typeof campaignInclude }>>>

function dateOnly(date: Date | null | undefined) {
  return date ? date.toISOString().slice(0, 10) : ''
}

function jsonArray(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value) ? value : []
}

function toCampaignDto(campaign: CampaignRecord) {
  return {
    id: campaign.externalId,
    databaseId: campaign.id,
    name: campaign.name,
    client: campaign.client,
    owner: campaign.owner,
    description: campaign.description || '',
    category: campaign.category,
    startDate: dateOnly(campaign.startDate),
    endDate: dateOnly(campaign.endDate),
    totalBudget: Number(campaign.budget || 0),
    creatorBudget: campaign.creatorBudget == null ? null : Number(campaign.creatorBudget),
    status: campaign.status,
    deliverables: jsonArray(campaign.defaultDeliverables),
    milestones: campaign.milestones.map((milestone) => ({ id: milestone.id, title: milestone.title, date: dateOnly(milestone.dueDate), owner: milestone.owner, status: milestone.status })),
    creators: campaign.creators.map((item) => ({
      creatorId: item.creatorId, name: item.creator.name, tiktokLink: item.creator.tiktokLink, tiktokId: item.creator.tiktokId, segment: item.creator.segment || '',
      category: item.creator.category, type: item.creator.type, concept: item.creator.concept || '', followers: item.creator.followers,
      gmvMonth: Number(item.creator.gmvMonth), status: item.status,
      suggestedPrice: Number(item.suggestedPrice), actualPrice: item.actualPrice == null ? '' : Number(item.actualPrice),
      expense: calculateBookingPricing(item.quotedCost ?? item.creator.cost, item.quotedExtraCost ?? item.creator.extraCost).bookingExpense,
      quotedCost: item.quotedCost == null ? '' : Number(item.quotedCost), quotedExtraCost: item.quotedExtraCost == null ? '' : Number(item.quotedExtraCost), scope: item.scope || '', pic: item.pic || '',
      metaEcomNote: item.metaEcomNote || '', finalTracking: item.finalTracking || '', finalNote: item.finalNote || '',
      kocDecision: item.kocDecision || (item.creatorConfirmed ? 'APPROVED' : 'PENDING'),
      deliverables: jsonArray(item.deliverablesData).length ? jsonArray(item.deliverablesData) : jsonArray(campaign.defaultDeliverables), clientDecision: item.clientDecision, clientNote: item.clientNote || '',
      clientChangedAt: item.clientChangedAt, clientChangeUnread: item.clientChangeUnread, creatorConfirmed: item.creatorConfirmed,
    })),
    reviewToken: campaign.reviewLinks[0]?.token || null,
    reviewExpiresAt: campaign.reviewLinks[0]?.expiresAt || null,
    lastClientReviewAt: campaign.lastClientReviewAt,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  }
}

async function campaignRecord(identifier: string) {
  const campaign = await prisma.campaign.findFirst({ where: { OR: [{ externalId: identifier }, { id: identifier }] }, include: campaignInclude })
  if (!campaign) throw new ApiError(404, 'Không tìm thấy Campaign.', 'CAMPAIGN_NOT_FOUND')
  return campaign
}

async function nextExternalId() {
  const year = new Date().getFullYear()
  const prefix = `CMP-${year}-`
  const rows = await prisma.campaign.findMany({ where: { externalId: { startsWith: prefix } }, select: { externalId: true } })
  const highest = rows.reduce((max, row) => Math.max(max, Number(row.externalId.slice(prefix.length)) || 0), 0)
  return `${prefix}${String(highest + 1).padStart(3, '0')}`
}

function deliverableJson(value: unknown) {
  return JSON.parse(JSON.stringify(value || [])) as Prisma.InputJsonValue
}

export async function listCampaigns() {
  const campaigns = await prisma.campaign.findMany({ include: campaignInclude, orderBy: { createdAt: 'desc' } })
  return campaigns.map(toCampaignDto)
}

export async function getCampaign(identifier: string) {
  return toCampaignDto(await campaignRecord(identifier))
}

export async function updateCampaignStatus(identifier: string, status: string) {
  const campaign = await campaignRecord(identifier)
  const updated = await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status },
    include: campaignInclude,
  })
  return toCampaignDto(updated)
}

export async function createCampaign(input: {
  name: string; client: string; owner: string; description: string; startDate: Date; endDate: Date; totalBudget: number; creatorBudget: number | null;
  category: string[]; creators: unknown[]; milestones: unknown[]; deliverables: unknown[];
}) {
  const creatorIds = [...new Set(input.creators.map((item) => String((item as Record<string, unknown>)?.creatorId || '')).filter(Boolean))]
  const creators = creatorIds.length ? await prisma.creator.findMany({ where: { id: { in: creatorIds } } }) : []
  const creatorById = new Map(creators.map((creator) => [creator.id, creator]))
  const milestones = input.milestones.flatMap((raw) => {
    const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    const dueDate = new Date(String(item.date || ''))
    if (!item.title || Number.isNaN(dueDate.getTime())) return []
    return [{ title: String(item.title), dueDate, owner: String(item.owner || input.owner), status: String(item.status || 'UPCOMING') }]
  })
  const expiresAt = new Date(); expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  const campaign = await prisma.campaign.create({
    data: {
      externalId: await nextExternalId(), name: input.name, client: input.client, owner: input.owner, description: input.description,
      category: input.category, startDate: input.startDate, endDate: input.endDate, budget: input.totalBudget, creatorBudget: input.creatorBudget,
      defaultDeliverables: deliverableJson(input.deliverables), status: 'DRAFT',
      milestones: { create: milestones },
      creators: { create: creatorIds.flatMap((creatorId) => {
        const creator = creatorById.get(creatorId)
        if (!creator) return []
        const pricing = calculateBookingPricing(creator.cost, creator.extraCost)
        return [{ creatorId, status: 'PROPOSED', suggestedPrice: pricing.bookingExpense, deliverablesData: deliverableJson(input.deliverables) }]
      }) },
      reviewLinks: { create: { token: randomUUID(), expiresAt } },
    },
    include: campaignInclude,
  })
  return toCampaignDto(campaign)
}

export async function updateCampaignInformation(identifier: string, input: {
  name: string; client: string; owner: string; description: string; category: string[];
  startDate: Date; endDate: Date; totalBudget: number; creatorBudget: number | null;
}) {
  const campaign = await campaignRecord(identifier)
  const updated = await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      name: input.name,
      client: input.client,
      owner: input.owner,
      description: input.description,
      category: input.category,
      startDate: input.startDate,
      endDate: input.endDate,
      budget: input.totalBudget,
      creatorBudget: input.creatorBudget,
    },
    include: campaignInclude,
  })
  return toCampaignDto(updated)
}

export async function addCreators(identifier: string, creatorIds: string[]) {
  const campaign = await campaignRecord(identifier)
  const existing = new Set(campaign.creators.map((item) => item.creatorId))
  const creators = await prisma.creator.findMany({ where: { id: { in: creatorIds.filter((id) => !existing.has(id)) } } })
  if (creators.length) await prisma.campaignCreator.createMany({ data: creators.map((creator) => ({
    campaignId: campaign.id, creatorId: creator.id, status: 'PROPOSED',
    suggestedPrice: calculateBookingPricing(creator.cost, creator.extraCost).bookingExpense,
    deliverablesData: deliverableJson(campaign.defaultDeliverables),
  })), skipDuplicates: true })
  return getCampaign(campaign.id)
}

export async function updateCampaignCreator(identifier: string, creatorId: string, changes: Record<string, unknown>) {
  const campaign = await campaignRecord(identifier)
  const assignment = await prisma.campaignCreator.findUnique({ where: { campaignId_creatorId: { campaignId: campaign.id, creatorId } } })
  if (!assignment) throw new ApiError(404, 'Creator không thuộc Campaign.', 'CAMPAIGN_CREATOR_NOT_FOUND')
  await prisma.campaignCreator.update({ where: { id: assignment.id }, data: {
    ...(changes.status !== undefined ? { status: String(changes.status) } : {}),
    ...(Object.hasOwn(changes, 'actualPrice') ? { actualPrice: changes.actualPrice == null ? null : Number(changes.actualPrice) } : {}),
    ...(Object.hasOwn(changes, 'quotedCost') ? { quotedCost: changes.quotedCost == null ? null : Number(changes.quotedCost) } : {}),
    ...(Object.hasOwn(changes, 'quotedExtraCost') ? { quotedExtraCost: changes.quotedExtraCost == null ? null : Number(changes.quotedExtraCost) } : {}),
    ...(changes.scope !== undefined ? { scope: String(changes.scope) } : {}),
    ...(changes.pic !== undefined ? { pic: String(changes.pic) } : {}),
    ...(changes.metaEcomNote !== undefined ? { metaEcomNote: String(changes.metaEcomNote) } : {}),
    ...(changes.finalTracking !== undefined ? { finalTracking: String(changes.finalTracking) } : {}),
    ...(changes.finalNote !== undefined ? { finalNote: String(changes.finalNote) } : {}),
    ...(changes.kocDecision !== undefined ? { kocDecision: String(changes.kocDecision), creatorConfirmed: String(changes.kocDecision) === 'APPROVED' } : {}),
    ...(changes.deliverables !== undefined ? { deliverablesData: deliverableJson(changes.deliverables) } : {}),
    ...(changes.creatorConfirmed !== undefined && changes.kocDecision === undefined ? { creatorConfirmed: Boolean(changes.creatorConfirmed), kocDecision: Boolean(changes.creatorConfirmed) ? 'APPROVED' : 'PENDING' } : {}),
  } })
  return getCampaign(campaign.id)
}

export async function removeCreator(identifier: string, creatorId: string) {
  const campaign = await campaignRecord(identifier)
  await prisma.campaignCreator.deleteMany({ where: { campaignId: campaign.id, creatorId } })
  return getCampaign(campaign.id)
}

export async function replaceMilestones(identifier: string, milestones: { title: string; dueDate: Date; owner: string; status: string }[]) {
  const campaign = await campaignRecord(identifier)
  await prisma.$transaction([
    prisma.milestone.deleteMany({ where: { campaignId: campaign.id } }),
    prisma.milestone.createMany({ data: milestones.map((milestone) => ({ ...milestone, campaignId: campaign.id })) }),
  ])
  return getCampaign(campaign.id)
}

export async function markClientChangesRead(identifier: string) {
  const campaign = await campaignRecord(identifier)
  await prisma.campaignCreator.updateMany({ where: { campaignId: campaign.id, clientChangeUnread: true }, data: { clientChangeUnread: false } })
  return getCampaign(campaign.id)
}

export async function ensureReviewLink(identifier: string) {
  const campaign = await campaignRecord(identifier)
  const active = campaign.reviewLinks[0]
  if (active && active.expiresAt > new Date()) return { token: active.token, expiresAt: active.expiresAt }
  const expiresAt = new Date(); expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  const reviewLink = await prisma.reviewLink.create({ data: { campaignId: campaign.id, token: randomUUID(), expiresAt } })
  return { token: reviewLink.token, expiresAt: reviewLink.expiresAt }
}

async function reviewLinkRecord(token: string) {
  const reviewLink = await prisma.reviewLink.findUnique({ where: { token }, include: { campaign: { include: campaignInclude } } })
  if (!reviewLink || reviewLink.revoked || reviewLink.expiresAt <= new Date()) throw new ApiError(404, 'Link review không hợp lệ hoặc đã hết hạn.', 'REVIEW_LINK_INVALID')
  return reviewLink
}

export async function getPublicReview(token: string) {
  const reviewLink = await reviewLinkRecord(token)
  return toCampaignDto(reviewLink.campaign)
}

export async function submitPublicReview(token: string, responses: { creatorId: string; decision: string; note: string }[]) {
  const reviewLink = await reviewLinkRecord(token)
  const assignmentByCreator = new Map(reviewLink.campaign.creators.map((item) => [item.creatorId, item]))
  const counts = { APPROVED: 0, REJECTED: 0, PENDING: 0, notes: 0 }
  const changedAt = new Date()
  const changes = responses.flatMap((response) => {
    const assignment = assignmentByCreator.get(response.creatorId)
    if (!assignment) return []
    const changed = response.decision !== assignment.clientDecision || response.note !== (assignment.clientNote || '')
    if (!changed) return []
    counts[response.decision as keyof Omit<typeof counts, 'notes'>] += 1
    if (response.note !== (assignment.clientNote || '')) counts.notes += 1
    return [{ assignment, response }]
  })
  if (!changes.length) return toCampaignDto(reviewLink.campaign)
  await prisma.$transaction(async (tx) => {
    for (const { assignment, response } of changes) {
      const status = response.decision === 'APPROVED' ? 'CLIENT_APPROVED' : response.decision === 'REJECTED' ? 'CLIENT_REJECTED' : 'PROPOSED'
      await tx.campaignCreator.update({ where: { id: assignment.id }, data: { clientDecision: response.decision, clientNote: response.note, clientChangedAt: changedAt, clientChangeUnread: true, status } })
      await tx.clientFeedback.create({ data: { reviewLinkId: reviewLink.id, campaignCreatorId: assignment.id, action: response.decision, comment: response.note } })
    }
    await tx.campaign.update({ where: { id: reviewLink.campaignId }, data: { lastClientReviewAt: changedAt } })
    const recipients = await tx.user.findMany({ where: { status: 'ACTIVE', role: { in: ['ADMIN', 'CAMPAIGN_MANAGER'] } }, select: { id: true } })
    const parts = [counts.APPROVED && `đồng ý ${counts.APPROVED}`, counts.REJECTED && `từ chối ${counts.REJECTED}`, counts.PENDING && `pending ${counts.PENDING}`, counts.notes && `${counts.notes} ghi chú`].filter(Boolean)
    const dedupeKey = `client-review:${reviewLink.campaignId}:${changedAt.getTime()}`
    if (recipients.length) await tx.notification.createMany({ data: recipients.map((user) => ({ userId: user.id, campaignId: reviewLink.campaignId, message: `${reviewLink.campaign.client} đã cập nhật Brand Review`, detail: `${reviewLink.campaign.name} · ${parts.join(' · ')}`, icon: 'userCheck', href: `/campaigns/${reviewLink.campaign.externalId}?tab=external-listings`, dedupeKey })), skipDuplicates: true })
  })
  return getCampaign(reviewLink.campaignId)
}

export async function submitPublicDeliverableFeedback(token: string, updates: { creatorId: string; deliverables: { id: string; brandFeedback: string }[] }[]) {
  const reviewLink = await reviewLinkRecord(token)
  const assignmentByCreator = new Map(reviewLink.campaign.creators.map((item) => [item.creatorId, item]))
  const changedAt = new Date()
  const changes = updates.flatMap((update) => {
    const assignment = assignmentByCreator.get(update.creatorId)
    if (!assignment || assignment.clientDecision !== 'APPROVED' || !assignment.creatorConfirmed) return []
    const feedbackById = new Map(update.deliverables.map((item) => [item.id, item.brandFeedback]))
    let changedCount = 0
    const storedDeliverables = jsonArray(assignment.deliverablesData)
    const nextDeliverables = (storedDeliverables.length ? storedDeliverables : jsonArray(reviewLink.campaign.defaultDeliverables)).map((raw) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw
      const item = raw as Record<string, Prisma.JsonValue>
      const id = String(item.id || '')
      if (!feedbackById.has(id)) return raw
      const brandFeedback = feedbackById.get(id) || ''
      if (brandFeedback === String(item.brandFeedback || '')) return raw
      changedCount += 1
      return { ...item, brandFeedback }
    })
    return changedCount ? [{ assignment, nextDeliverables, changedCount }] : []
  })
  if (!changes.length) return toCampaignDto(reviewLink.campaign)
  const totalDeliverables = changes.reduce((sum, item) => sum + item.changedCount, 0)
  await prisma.$transaction(async (tx) => {
    for (const change of changes) {
      await tx.campaignCreator.update({ where: { id: change.assignment.id }, data: { deliverablesData: deliverableJson(change.nextDeliverables), clientChangedAt: changedAt, clientChangeUnread: true } })
      await tx.clientFeedback.create({ data: { reviewLinkId: reviewLink.id, campaignCreatorId: change.assignment.id, action: 'DELIVERABLE_FEEDBACK', comment: `${change.changedCount} deliverable được cập nhật` } })
    }
    const recipients = await tx.user.findMany({ where: { status: 'ACTIVE', role: { in: ['ADMIN', 'CAMPAIGN_MANAGER'] } }, select: { id: true } })
    const dedupeKey = `deliverable-feedback:${reviewLink.campaignId}:${changedAt.getTime()}`
    if (recipients.length) await tx.notification.createMany({ data: recipients.map((user) => ({ userId: user.id, campaignId: reviewLink.campaignId, message: `${reviewLink.campaign.client} đã cập nhật Deliverable`, detail: `${reviewLink.campaign.name} · ${totalDeliverables} feedback · ${changes.length} KOC`, icon: 'checkSquare', href: `/campaigns/${reviewLink.campaign.externalId}?tab=deliverables`, dedupeKey })), skipDuplicates: true })
  })
  return getCampaign(reviewLink.campaignId)
}
