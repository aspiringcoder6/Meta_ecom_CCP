import assert from 'node:assert/strict'
import test from 'node:test'

process.env.DATABASE_URL ||= 'postgresql://test:test@127.0.0.1:1/test'
process.env.JWT_SECRET ||= 'test-only-secret-not-used-for-sessions'
const { submitPublicReview, updateCampaignCreator, submitPublicDeliverableFeedback } = await import('./campaign.service.js')

type Row = Record<string, any>

function fixture() {
  const notifications: Row[] = []
  const feedback: Row[] = []
  const assignments = ['c1', 'c2'].map((creatorId) => ({
    id: `assignment-${creatorId}`, creatorId, clientDecision: 'APPROVED', clientNote: 'Keep this note',
    status: 'CLIENT_APPROVED', creatorConfirmed: true, kocDecision: 'APPROVED', brandProducts: [],
    deliverablesData: [{ id: `template-${creatorId}`, type: 'Video TikTok', status: 'NOT_STARTED' }],
    creator: { id: creatorId, name: creatorId, tiktokId: creatorId, tiktokLink: `https://tiktok.com/@${creatorId}`, category: [], type: ['VIDEO'], followers: 1, gmvMonth: 2, cost: 0, extraCost: 0 },
  })) as Row[]
  const campaign: Row = {
    id: 'campaign-db', externalId: 'CMP-TEST', name: 'Test Campaign', client: 'Test Brand', owner: 'Admin', status: 'DRAFT',
    creators: assignments, milestones: [], reviewLinks: [], defaultDeliverables: [], budget: 0, category: [], segmentGoals: {},
  }
  const review: Row = { id: 'review-1', campaignId: campaign.id, campaign, expiresAt: new Date('2099-01-01'), revoked: false }
  const tx = {
    $queryRaw: async () => [],
    campaignCreator: {
      findUnique: async ({ where }: Row) => assignments.find((item) => item.creatorId === where.campaignId_creatorId.creatorId),
      findUniqueOrThrow: async ({ where }: Row) => assignments.find((item) => item.id === where.id),
      update: async ({ where, data }: Row) => { const row = assignments.find((item) => item.id === where.id)!; Object.assign(row, data); return row },
    },
    campaign: { findFirst: async () => campaign, update: async ({ data }: Row) => Object.assign(campaign, data) },
    user: { findMany: async () => [{ id: 'admin' }, { id: 'manager' }] },
    notification: { createMany: async ({ data }: Row) => { notifications.push(...data) } },
    clientFeedback: { create: async ({ data }: Row) => { feedback.push(data) } },
    reviewLink: { findUnique: async () => structuredClone(review) },
  }
  let beforeTransaction: (() => void) | undefined
  const database = { ...tx, $transaction: async (fn: (client: typeof tx) => Promise<unknown>) => { beforeTransaction?.(); beforeTransaction = undefined; return fn(tx) } } as unknown as NonNullable<Parameters<typeof submitPublicReview>[2]>
  return { assignments, notifications, feedback, database, beforeTransaction: (fn: () => void) => { beforeTransaction = fn } }
}

test('Brand product batch persists, generates videos, marks changes unread and sends one notification per recipient', async () => {
  const data = fixture()
  const result = await submitPublicReview('token', [{ creatorId: 'c1', brandProducts: ['A', 'B'] }, { creatorId: 'c2', brandProducts: ['A'] }], data.database)
  assert.deepEqual(result.creators[0]?.brandProducts, ['A', 'B'])
  assert.equal(data.assignments[0]?.deliverablesData.length, 2)
  assert.equal(data.assignments[1]?.deliverablesData.length, 1)
  assert.equal(data.assignments[0]?.clientDecision, 'APPROVED')
  assert.equal(data.assignments[0]?.clientNote, 'Keep this note')
  assert.equal(data.assignments[0]?.clientChangeUnread, true)
  assert.equal(data.notifications.length, 2, 'one per recipient, not one per product/KOC')
  assert.match(data.notifications[0]?.detail, /2 KOC cập nhật sản phẩm/)
  assert.doesNotMatch(data.notifications[0]?.detail, /đồng ý/)
  const firstVideos = structuredClone(data.assignments[0]?.deliverablesData)
  await submitPublicReview('token', [{ creatorId: 'c1', brandProducts: ['b', 'a'] }], data.database)
  assert.deepEqual(data.assignments[0]?.deliverablesData, firstVideos)
  assert.equal(data.notifications.length, 2, 'no duplicate alert for unchanged resubmission')
})

test('team product edits also generate videos and preserve completed data', async () => {
  const data = fixture()
  data.assignments[0]!.deliverablesData = [{ id: 'completed', product: 'A', progress: 'Done', brandFeedback: 'OK' }]
  await updateCampaignCreator('CMP-TEST', 'c1', { brandProducts: ['A', 'B'] }, data.database)
  assert.deepEqual(data.assignments[0]?.brandProducts, ['A', 'B'])
  assert.equal(data.assignments[0]?.deliverablesData.length, 2)
  assert.equal(data.assignments[0]?.deliverablesData[0].brandFeedback, 'OK')
  await updateCampaignCreator('CMP-TEST', 'c1', { metaEcomNote: 'Team note' }, data.database)
  assert.equal(data.assignments[0]?.deliverablesData.length, 2)
  assert.equal(data.notifications.length, 0)
})

test('team can manually rename a generated deliverable without creating another video on autosave', async () => {
  const data = fixture()
  await updateCampaignCreator('CMP-TEST', 'c1', { brandProducts: ['A'] }, data.database)
  const deliverables = data.assignments[0]!.deliverablesData.map((item: Row) => ({ ...item, product: 'A - updated' }))
  await updateCampaignCreator('CMP-TEST', 'c1', { deliverables }, data.database)
  assert.equal(data.assignments[0]?.deliverablesData.length, 1)
  assert.equal(data.assignments[0]?.deliverablesData[0].product, 'A - updated')
})

test('public product-only edits preserve latest approval/notes read after locking', async () => {
  const data = fixture()
  data.beforeTransaction(() => { data.assignments[0]!.clientDecision = 'REJECTED'; data.assignments[0]!.clientNote = 'New concurrent note' })
  await submitPublicReview('token', [{ creatorId: 'c1', brandProducts: ['A'] }], data.database)
  assert.equal(data.assignments[0]?.clientDecision, 'REJECTED')
  assert.equal(data.assignments[0]?.clientNote, 'New concurrent note')
})

test('Brand feedback does not erase videos added since the initial read', async () => {
  const data = fixture()
  data.beforeTransaction(() => { data.assignments[0]!.deliverablesData.push({ id: 'new-video', product: 'B', progress: 'Đang liên hệ' }) })
  await submitPublicDeliverableFeedback('token', [{ creatorId: 'c1', deliverables: [{ id: 'template-c1', brandFeedback: 'New feedback' }] }], data.database)
  assert.equal(data.assignments[0]?.deliverablesData.length, 2)
  assert.equal(data.assignments[0]?.deliverablesData[0].brandFeedback, 'New feedback')
  assert.equal(data.assignments[0]?.deliverablesData[1].product, 'B')
})
