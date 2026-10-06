import assert from 'node:assert/strict'
import test from 'node:test'

process.env.DATABASE_URL ||= 'postgresql://test:test@127.0.0.1:1/test'
process.env.JWT_SECRET ||= 'test-only-secret-not-used-for-sessions'
const { createCampaign, ensureReviewLink, getCampaign, getPublicReview, submitPublicReview, submitPublicDeliverableFeedback } = await import('./campaign.service.js')

type Link = { id: string; token: string; campaignId: string; expiresAt: Date | null; revoked: boolean; createdAt: Date }

function fixture(initialLinks: Partial<Link>[] = []) {
  const links: Link[] = initialLinks.map((link, index) => ({
    id: `link-${index}`, token: `shared-token-${index}`, campaignId: 'campaign-db',
    expiresAt: null, revoked: false, createdAt: new Date('2020-01-01'), ...link,
  }))
  let createdCount = 0
  let lockCount = 0
  let transactionLocked = false
  const campaign = {
    id: 'campaign-db', externalId: 'CMP-TEST', name: 'Test Campaign', client: 'Test Brand',
    owner: 'Admin', status: 'DRAFT', category: [], segmentGoals: {},
    creators: [], milestones: [], defaultDeliverables: [], budget: 0,
  }
  const latestActive = () => links.filter((link) => !link.revoked)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id))[0]
  const record = () => ({ ...campaign, reviewLinks: latestActive() ? [latestActive()] : [] })
  const tx = {
    $queryRaw: async (query: { sql: string; values: unknown[] }) => {
      assert.match(query.sql, /FROM "Campaign".*FOR UPDATE/)
      assert.deepEqual(query.values, ['campaign-db'])
      lockCount += 1
      transactionLocked = true
      return [{ id: 'campaign-db' }]
    },
    campaign: {
      findFirst: async () => record(),
      findMany: async () => [],
      create: async ({ data }: { data: { reviewLinks: { create: Partial<Link> } } }) => {
        links.push({ id: 'created-link', token: '', campaignId: campaign.id, revoked: false, createdAt: new Date(), expiresAt: null, ...data.reviewLinks.create })
        return record()
      },
    },
    reviewLink: {
      findFirst: async ({ where }: { where: { campaignId: string; revoked: boolean } }) => {
        assert.equal(transactionLocked, true, 're-read the link only after locking the campaign')
        assert.deepEqual(where, { campaignId: 'campaign-db', revoked: false })
        return latestActive() || null
      },
      findUnique: async ({ where }: { where: { token: string } }) => {
        const link = links.find((item) => item.token === where.token)
        return link ? { ...link, campaign: record() } : null
      },
      update: async ({ where, data }: { where: { id: string }; data: { expiresAt: null } }) => Object.assign(links.find((link) => link.id === where.id)!, data),
      create: async ({ data }: { data: { campaignId: string; token: string; expiresAt: null } }) => {
        assert.equal(transactionLocked, true)
        createdCount += 1
        const link = { id: `created-${createdCount}`, revoked: false, createdAt: new Date(), ...data }
        links.push(link)
        return link
      },
    },
  }
  // Model the per-campaign serialization provided by PostgreSQL's row lock.
  let queue = Promise.resolve<unknown>(undefined)
  const database = {
    ...tx,
    $transaction: (fn: (client: typeof tx) => Promise<unknown>) => {
      const result = queue.then(async () => {
        transactionLocked = false
        return fn(tx)
      })
      queue = result.catch(() => {})
      return result
    },
  } as unknown as NonNullable<Parameters<typeof ensureReviewLink>[1]>
  return { database, links, campaign, createdCount: () => createdCount, lockCount: () => lockCount }
}

test('campaign creation persists a permanent random review token', async () => {
  const data = fixture()
  const result = await createCampaign({
    name: 'New Campaign', client: 'Brand', owner: 'Admin', description: '',
    startDate: new Date('2026-01-01'), endDate: new Date('2026-02-01'), totalBudget: 0,
    creatorBudget: null, category: [], segmentGoals: {}, creators: [], milestones: [], deliverables: [],
  }, data.database)
  assert.match(result.reviewToken!, /^[0-9a-f-]{36}$/)
  assert.equal(data.links[0]?.expiresAt, null)
  assert.equal(result.reviewExpiresAt, null)
  assert.equal((await ensureReviewLink('CMP-TEST', data.database)).token, result.reviewToken)
  assert.equal(data.createdCount(), 0)
})

test('repeated and simultaneous opens return the same persisted, non-expiring token', async () => {
  const data = fixture()
  const results = await Promise.all(Array.from({ length: 8 }, () => ensureReviewLink('CMP-TEST', data.database)))
  assert.equal(new Set(results.map((result) => result.token)).size, 1)
  assert.ok(results.every((result) => result.expiresAt === null))
  assert.equal(data.createdCount(), 1)
  assert.equal(data.lockCount(), 8)
  assert.equal((await getCampaign('CMP-TEST', data.database)).reviewToken, results[0]?.token)
})

test('existing expired links are upgraded without changing their token', async () => {
  const data = fixture([{ token: 'already-shared', expiresAt: new Date('2000-01-01') }])
  const result = await ensureReviewLink('CMP-TEST', data.database)
  assert.deepEqual(result, { token: 'already-shared', expiresAt: null })
  assert.equal(data.links[0]?.expiresAt, null)
  assert.equal(data.createdCount(), 0)
})

test('every old non-revoked token still opens and submits reviews regardless of legacy expiry', async () => {
  const data = fixture([
    { token: 'old-shared-link', expiresAt: new Date('2000-01-01') },
    { token: 'newer-shared-link', createdAt: new Date('2021-01-01'), expiresAt: new Date('2099-01-01') },
  ])
  for (const link of data.links) {
    assert.equal((await getPublicReview(link.token, data.database)).id, 'CMP-TEST')
    assert.equal((await submitPublicReview(link.token, [], data.database)).id, 'CMP-TEST')
    assert.equal((await submitPublicDeliverableFeedback(link.token, [], data.database)).id, 'CMP-TEST')
  }
  assert.equal((await ensureReviewLink('CMP-TEST', data.database)).token, 'newer-shared-link')
  // Changes to campaign metadata/status do not rotate the token.
  data.campaign.client = 'Renamed Brand'
  data.campaign.status = 'COMPLETED'
  assert.equal((await ensureReviewLink('CMP-TEST', data.database)).token, 'newer-shared-link')
  assert.equal(data.createdCount(), 0)
})

test('revoked and unknown links remain invalid for reads and both submission routes', async () => {
  const data = fixture([{ token: 'revoked-token', revoked: true }])
  for (const token of ['revoked-token', 'unknown-token']) {
    for (const action of [
      () => getPublicReview(token, data.database),
      () => submitPublicReview(token, [], data.database),
      () => submitPublicDeliverableFeedback(token, [], data.database),
    ]) {
      await assert.rejects(action, { statusCode: 404, code: 'REVIEW_LINK_INVALID' })
    }
  }
  const replacement = await ensureReviewLink('CMP-TEST', data.database)
  assert.notEqual(replacement.token, 'revoked-token')
  assert.equal(data.links[0]?.revoked, true, 'never reactivate a deliberately revoked link')
})
