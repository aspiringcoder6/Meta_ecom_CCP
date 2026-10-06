import assert from 'node:assert/strict'
import test from 'node:test'

process.env.DATABASE_URL ||= 'postgresql://test:test@127.0.0.1:1/test'
process.env.JWT_SECRET ||= 'test-only-secret-not-used-for-sessions'
const { submitPublicReview, updateCampaignCreator, submitPublicDeliverableFeedback } = await import('./campaign.service.js')

type Row = Record<string, any>

function fixture(size = 2) {
  const notifications: Row[] = []
  const feedback: Row[] = []
  const calls = { locks: 0, reads: 0, batchUpdates: 0, feedbackBatches: 0, transactionOptions: undefined as Row | undefined }
  let failFeedback = false
  let badCreator: { id: string; code: string } | undefined
  let timeoutAbove = Infinity
  let failRefresh = false
  const assignments = Array.from({ length: size }, (_, index) => `c${index + 1}`).map((creatorId) => ({
    id: `assignment-${creatorId}`, campaignId: 'campaign-db', creatorId, clientDecision: 'APPROVED', clientNote: 'Keep this note',
    status: 'CLIENT_APPROVED', creatorConfirmed: true, kocDecision: 'APPROVED', brandProducts: [],
    deliverablesData: [{ id: `template-${creatorId}`, type: 'Video TikTok', status: 'NOT_STARTED' }],
    creator: { id: creatorId, name: creatorId, tiktokId: creatorId, tiktokLink: `https://tiktok.com/@${creatorId}`, category: [], type: ['VIDEO'], followers: 1, gmvMonth: 2, cost: 0, extraCost: 0 },
  })) as Row[]
  const campaign: Row = {
    id: 'campaign-db', externalId: 'CMP-TEST', name: 'Test Campaign', client: 'Test Brand', owner: 'Admin', status: 'DRAFT',
    creators: assignments, milestones: [], reviewLinks: [], defaultDeliverables: [], budget: 0, category: [], segmentGoals: {}, lastClientReviewAt: null,
  }
  const review: Row = { id: 'review-1', campaignId: campaign.id, campaign, expiresAt: new Date('2099-01-01'), revoked: false }
  const tx = {
    $queryRaw: async () => { calls.locks += 1; return [] },
    $executeRaw: async (query: { values: unknown[] }) => {
      calls.batchUpdates += 1
      const rows = JSON.parse(query.values.find((value) => typeof value === 'string' && value.startsWith('[{"id"')) as string) as Row[]
      if (rows.length > timeoutAbove) throw Object.assign(new Error('Simulated transaction timeout'), { code: 'P2028' })
      if (badCreator && rows.some((row) => row.id === `assignment-${badCreator!.id}`)) throw Object.assign(new Error('Simulated row storage error'), { code: badCreator.code })
      const changedAt = query.values.find((value) => value instanceof Date)
      for (const patch of rows) {
        const row = assignments.find((item) => item.id === patch.id && item.campaignId === 'campaign-db')!
        if (patch.decisionChanged) Object.assign(row, { clientDecision: patch.clientDecision, status: patch.status })
        if (patch.noteChanged) row.clientNote = patch.clientNote
        if (patch.productsChanged) row.brandProducts = patch.brandProducts
        if (patch.deliverablesChanged) row.deliverablesData = patch.deliverablesData
        Object.assign(row, { clientChangedAt: changedAt, clientChangeUnread: true })
      }
      return rows.length
    },
    campaignCreator: {
      findMany: async ({ where }: Row) => {
        calls.reads += 1
        return structuredClone(assignments.filter((item) => item.campaignId === where.campaignId && where.creatorId.in.includes(item.creatorId)))
      },
      findUnique: async ({ where }: Row) => assignments.find((item) => item.creatorId === where.campaignId_creatorId.creatorId),
      findUniqueOrThrow: async ({ where }: Row) => assignments.find((item) => item.id === where.id),
      update: async ({ where, data }: Row) => { const row = assignments.find((item) => item.id === where.id)!; Object.assign(row, data); return row },
    },
    campaign: { findFirst: async () => { if (failRefresh) throw new Error('Database unavailable on refresh'); return campaign }, update: async ({ data }: Row) => Object.assign(campaign, data) },
    user: { findMany: async () => [{ id: 'admin' }, { id: 'manager' }] },
    notification: {
      createMany: async ({ data }: Row) => { notifications.push(...data) },
      upsert: async ({ where, create, update }: Row) => {
        const key = where.userId_dedupeKey
        const existing = notifications.find((item) => item.userId === key.userId && item.dedupeKey === key.dedupeKey)
        if (existing) Object.assign(existing, update)
        else notifications.push(create)
      },
    },
    clientFeedback: { createMany: async ({ data }: Row) => {
      calls.feedbackBatches += 1
      if (failFeedback) { failFeedback = false; throw new Error('Simulated feedback storage failure') }
      feedback.push(...data)
    } },
    reviewLink: { findUnique: async () => structuredClone(review) },
  }
  let beforeTransaction: (() => void) | undefined
  const database = { ...tx, $transaction: async (fn: (client: typeof tx) => Promise<unknown>, options?: Row) => {
    beforeTransaction?.(); beforeTransaction = undefined
    calls.transactionOptions = options
    const snapshot = structuredClone(assignments)
    const lastClientReviewAt = campaign.lastClientReviewAt
    const notificationSnapshot = structuredClone(notifications)
    const feedbackCount = feedback.length
    try { return await fn(tx) } catch (error) {
      assignments.splice(0, assignments.length, ...snapshot)
      campaign.lastClientReviewAt = lastClientReviewAt
      notifications.splice(0, notifications.length, ...notificationSnapshot); feedback.splice(feedbackCount)
      throw error
    }
  } } as unknown as NonNullable<Parameters<typeof submitPublicReview>[2]>
  return {
    assignments, notifications, feedback, database, calls,
    beforeTransaction: (fn: () => void) => { beforeTransaction = fn }, failNextFeedback: () => { failFeedback = true },
    failCreator: (id: string, code = 'P2000') => { badCreator = { id, code } },
    timeOutLargeChunks: (limit: number) => { timeoutAbove = limit },
    failCampaignRefresh: () => { failRefresh = true },
  }
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

test('200 Brand Pick/notes/product changes use four independently committed bulk chunks and one summary', async () => {
  const data = fixture(200)
  for (const row of data.assignments) { row.clientDecision = 'PENDING'; row.status = 'PROPOSED' }
  const responses = data.assignments.map((row, index) => ({ creatorId: row.creatorId as string, decision: 'APPROVED', note: `Note ${index}`, brandProducts: ['Sữa A', 'Sữa B'] }))
  const result = await submitPublicReview('token', responses, data.database)
  assert.equal(result.creators.length, 200)
  for (let index = 0; index < 200; index += 1) {
    const saved = data.assignments[index]!
    assert.equal(saved.clientDecision, 'APPROVED')
    assert.equal(saved.clientNote, `Note ${index}`)
    assert.deepEqual(saved.brandProducts, ['Sữa A', 'Sữa B'])
    assert.equal(saved.deliverablesData.length, 2)
    assert.equal(saved.clientChangeUnread, true)
  }
  assert.deepEqual(data.calls, { locks: 4, reads: 4, batchUpdates: 4, feedbackBatches: 4, transactionOptions: { maxWait: 5_000, timeout: 15_000 } })
  assert.equal(result.submissionResult.savedCount, 200)
  assert.equal(result.submissionResult.errors.length, 0)
  assert.equal(data.feedback.length, 200)
  assert.equal(data.notifications.length, 2, 'one summary per recipient, not 200 separate alerts')
  assert.match(data.notifications[0]?.detail, /đồng ý 200/)
  await submitPublicReview('token', responses, data.database)
  assert.equal(data.calls.batchUpdates, 4, 'resubmission is a no-op')
  assert.equal(data.feedback.length, 200)
  assert.equal(data.notifications.length, 2)
})

test('Brand Feedback for 200 creators/400 deliverables persists in bulk chunks with one summary', async () => {
  const data = fixture(200)
  for (const row of data.assignments) row.deliverablesData.push({ id: `second-${row.creatorId}`, progress: 'Done', airLink: 'https://tiktok.com/video' })
  const updates = data.assignments.map((row) => ({ creatorId: row.creatorId as string, deliverables: row.deliverablesData.map((item: Row) => ({ id: item.id as string, brandFeedback: 'Brand feedback' })) }))
  const result = await submitPublicDeliverableFeedback('token', updates, data.database)
  assert.equal(data.calls.locks, 4)
  assert.equal(data.calls.reads, 4)
  assert.equal(data.calls.batchUpdates, 4)
  assert.equal(data.calls.feedbackBatches, 4)
  assert.equal(result.submissionResult.savedCount, 400)
  for (const row of data.assignments) {
    assert.equal(row.deliverablesData.length, 2)
    assert.ok(row.deliverablesData.every((item: Row) => item.brandFeedback === 'Brand feedback'))
    assert.equal(row.deliverablesData[1].progress, 'Done')
    assert.equal(row.deliverablesData[1].airLink, 'https://tiktok.com/video')
  }
  assert.equal(data.notifications.length, 2)
  assert.match(data.notifications[0]?.detail, /400 feedback · 200 KOC/)
})

test('a system error rolls back the failed chunk and reports all unconfirmed changes', async () => {
  const data = fixture(200)
  const original = structuredClone(data.assignments)
  data.failNextFeedback()
  const result = await submitPublicReview('token', data.assignments.map((row) => ({ creatorId: row.creatorId as string, decision: 'REJECTED', note: 'New note' })), data.database)
  assert.equal(result.submissionResult.savedCount, 0)
  assert.equal(result.submissionResult.errors.length, 200)
  assert.equal(result.submissionResult.interrupted, true)
  assert.deepEqual(data.assignments, original)
  assert.equal(data.feedback.length, 0)
  assert.equal(data.notifications.length, 0)
})

test('duplicate Creator entries merge fields once, and unknown/foreign creators are not changed', async () => {
  const data = fixture()
  data.assignments[1]!.campaignId = 'other-campaign'
  const result = await submitPublicReview('token', [
    { creatorId: 'c1', note: 'First note' }, { creatorId: 'c1', brandProducts: ['A'] }, { creatorId: 'c1', note: 'Last note' },
    { creatorId: 'c2', decision: 'REJECTED' }, { creatorId: 'unknown', decision: 'APPROVED' },
  ], data.database)
  assert.equal(data.assignments[0]?.clientNote, 'Last note')
  assert.deepEqual(data.assignments[0]?.brandProducts, ['A'])
  assert.equal(data.assignments[1]?.clientDecision, 'APPROVED')
  assert.equal(data.feedback.length, 1)
  assert.equal(result.submissionResult.savedCount, 1)
  assert.equal(result.submissionResult.errors.length, 2)
})

test('invalid Brand responses are skipped while the other 199 creators are saved', async () => {
  const data = fixture(200)
  const responses = data.assignments.map((row) => ({ creatorId: row.creatorId, decision: row.creatorId === 'c48' ? 'WRONG' : 'REJECTED' }))
  const result = await submitPublicReview('token', responses, data.database)
  assert.equal(result.submissionResult.savedCount, 199)
  assert.deepEqual(result.submissionResult.errors.map(({ creatorId, row }) => ({ creatorId, row })), [{ creatorId: 'c48', row: 48 }])
  assert.equal(data.assignments[47]?.clientDecision, 'APPROVED')
  assert.equal(data.assignments.filter((row) => row.clientDecision === 'REJECTED').length, 199)
  assert.equal(data.notifications.length, 2)
  assert.match(data.notifications[0]?.detail, /từ chối 199/)
})

test('a database constraint failure isolates one creator, keeps earlier commits and saves later chunks', async () => {
  const data = fixture(200)
  data.failCreator('c72')
  const result = await submitPublicReview('token', data.assignments.map((row) => ({ creatorId: row.creatorId, note: 'Brand update' })), data.database)
  assert.equal(result.submissionResult.savedCount, 199)
  assert.equal(result.submissionResult.interrupted, false)
  assert.deepEqual(result.submissionResult.errors.map(({ creatorId }) => creatorId), ['c72'])
  assert.match(result.submissionResult.errors[0]!.message, /vượt giới hạn/)
  assert.equal(data.assignments[71]?.clientNote, 'Keep this note')
  assert.equal(data.assignments.filter((row) => row.clientNote === 'Brand update').length, 199)
  assert.equal(data.feedback.length, 199)
  assert.equal(data.notifications.length, 2)
  assert.match(data.notifications[0]?.detail, /199 ghi chú/)
})

test('timed-out chunks are retried in smaller chunks without duplicate feedback/notifications', async () => {
  const data = fixture(200)
  data.timeOutLargeChunks(25)
  const result = await submitPublicReview('token', data.assignments.map((row) => ({ creatorId: row.creatorId, decision: 'REJECTED' })), data.database)
  assert.equal(result.submissionResult.savedCount, 200)
  assert.equal(result.submissionResult.errors.length, 0)
  assert.equal(data.feedback.length, 200)
  assert.equal(data.notifications.length, 2)
  assert.match(data.notifications[0]?.detail, /từ chối 200/)
})

test('connection failure after 50 commits acknowledges them even if the final refresh also fails', async () => {
  const data = fixture(200)
  data.failCreator('c51', 'ECONNREFUSED')
  data.failCampaignRefresh()
  const result = await submitPublicReview('token', data.assignments.map((row) => ({ creatorId: row.creatorId, decision: 'REJECTED', brandProducts: ['A'] })), data.database)
  assert.equal(result.submissionResult.savedCount, 50)
  assert.equal(result.submissionResult.errors.length, 150)
  assert.equal(result.submissionResult.interrupted, true)
  assert.equal(data.feedback.length, 50)
  assert.equal(result.creators.filter((row) => row.clientDecision === 'REJECTED').length, 50)
  assert.equal(result.creators[0]?.clientChangeUnread, true)
  assert.ok(result.lastClientReviewAt)
  assert.equal(data.notifications.length, 2)
  assert.match(data.notifications[0]?.detail, /từ chối 50/)
})

test('feedback skips an invalid/missing deliverable but saves valid feedback for the same and other KOCs', async () => {
  const data = fixture()
  const result = await submitPublicDeliverableFeedback('token', [
    { creatorId: 'c1', deliverables: [{ id: 'template-c1', brandFeedback: 'Good' }, { id: 'missing', brandFeedback: 'Missing' }, { brandFeedback: 'Invalid' }] },
    { creatorId: 'c2', deliverables: [{ id: 'template-c2', brandFeedback: 'Also good' }] },
  ], data.database)
  assert.equal(result.submissionResult.savedCount, 2)
  assert.equal(result.submissionResult.errors.length, 2)
  assert.deepEqual(result.submissionResult.savedDeliverables, [{ creatorId: 'c1', id: 'template-c1' }, { creatorId: 'c2', id: 'template-c2' }])
  assert.equal(data.assignments[0]?.deliverablesData[0].brandFeedback, 'Good')
  assert.equal(data.assignments[1]?.deliverablesData[0].brandFeedback, 'Also good')
})

test('Brand feedback also isolates creator storage errors and saves the rest', async () => {
  const data = fixture(200)
  data.failCreator('c72')
  const result = await submitPublicDeliverableFeedback('token', data.assignments.map((row) => ({ creatorId: row.creatorId, deliverables: [{ id: `template-${row.creatorId}`, brandFeedback: 'Feedback' }] })), data.database)
  assert.equal(result.submissionResult.savedCount, 199)
  assert.equal(result.submissionResult.errors[0]?.creatorId, 'c72')
  assert.equal(result.submissionResult.interrupted, false)
  assert.equal(data.assignments[71]?.deliverablesData[0].brandFeedback, undefined)
  assert.equal(data.notifications.length, 2)
  assert.match(data.notifications[0]?.detail, /199 feedback · 199 KOC/)
})
