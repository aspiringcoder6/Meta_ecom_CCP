import assert from 'node:assert/strict'
import test from 'node:test'
process.env.DATABASE_URL ||= 'postgresql://test:test@127.0.0.1:1/test'
process.env.JWT_SECRET ||= 'brand-workspace-tests-only'
const { pageBrandRows, publicListingRow, brandWorkspace } = await import('./brand-workspace.service.js')
const { publicReviewDto } = await import('./brand-public-dto.js')
type Row = Record<string, any>
const profile = (index: number) => ({ creatorId: `c${index}`, revision: index, name: `Creator ${index}`, tiktokId: `creator${index}`, tiktokLink: `https://tiktok.com/@creator${index}`, category: ['Beauty > Skincare'], type: ['VIDEO'], segment: index % 2 ? 'TOP' : 'MINI', followers: index, gmvMonth: index * 100, expense: index * 1000, clientNote: '', brandProducts: ['Serum'], clientDecision: 'APPROVED', kocDecision: 'APPROVED', creatorConfirmed: true, metaEcomNote: '', createdAt: new Date('2026-01-01') })
test('server pagination/filter/multi-sort operate across the whole campaign, not only the visible page', () => {
  const rows = Array.from({ length: 201 }, (_, index) => profile(index))
  const result = pageBrandRows(rows, { page: 2, pageSize: 25, filters: JSON.stringify({ segment: ['TOP'], category: ['Beauty'] }), sort: JSON.stringify([{ key: 'followers', direction: 'desc' }]) })
  assert.equal(result.pagination.total, 100); assert.equal(result.creators.length, 25)
  assert.equal(result.creators[0]!.followers, 149)
  assert.equal(pageBrandRows(rows, { page: 99, pageSize: 100 }).pagination.page, 3)
  assert.doesNotThrow(() => pageBrandRows(rows, { filters: 'null', sort: '[null,7,{}]' }))
})
test('deliverable filters and sorting preserve a creator group and remove nonmatching child rows', () => {
  const result = pageBrandRows([{ ...profile(1), deliverables: [{ id: 'a', product: 'A', progress: 'Done' }, { id: 'b', product: 'B', progress: 'Lên demo' }] }], { filters: JSON.stringify({ progress: ['Lên demo'] }), sort: JSON.stringify([{ key: 'product', direction: 'desc' }]) })
  assert.equal(result.creators[0]!.deliverables!.length, 1)
  assert.equal(result.creators[0]!.deliverables![0]!.id, 'b')
})
test('public projections exclude all internal financial/contact data, including legacy public endpoints', () => {
  const creator = { ...profile(1), cost: 12, extraCost: 3, actualPrice: 100, quotedCost: 4, quotedExtraCost: 5, creator: { ...profile(1), cost: 12, extraCost: 3 }, finalNote: 'SECRET', contact: 'PRIVATE', pic: 'STAFF' } as Row
  const row = publicListingRow(creator as Parameters<typeof publicListingRow>[0])
  assert.equal(row.expense, 100)
  const result = publicReviewDto({ id: 'CMP', reviewToken: 'secret-token', totalBudget: 123, creators: [{ ...creator, deliverables: [{ id: 'd', brandFeedback: 'ok', performance: 999, internalNote: 'HIDDEN' }] }] })
  const encoded = JSON.stringify([row, result])
  for (const field of ['quotedCost', 'quotedExtraCost', 'extraCost', 'actualPrice', 'finalNote', 'contact', 'pic', 'reviewToken', 'totalBudget', 'performance', 'internalNote']) assert.equal(encoded.includes(`"${field}"`), false, field)
})
test('initial Brand listing query never loads per-KOC deliverable JSON or shipment history', async () => {
  const campaign = { id: 'db', externalId: 'CMP', name: 'Campaign', client: 'Brand', defaultDeliverables: [] }
  let reads = 0
  const database = { reviewLink: { findUnique: async () => ({ id: 'link', revoked: false, campaignId: 'db', campaign }) }, campaignCreator: { findMany: async (args: Row) => {
    reads++; assert.equal(args.select.deliverablesData, undefined)
    return Array.from({ length: 200 }, (_, i) => ({ ...profile(i), creator: { ...profile(i), cost: 0, extraCost: 0 } }))
  } } } as unknown as NonNullable<Parameters<typeof brandWorkspace>[2]>
  const result = await brandWorkspace('token', { tab: 'listing' }, database)
  assert.equal(reads, 1); assert.equal(result.creators.length, 25); assert.equal(result.pagination.total, 200)
  assert.equal(result.creators[0]!.deliverables, undefined)
  const lookup = await brandWorkspace('token', { tab: 'listing', pageSize: 100, handles: JSON.stringify(['@creator199']) }, database)
  assert.equal(lookup.pagination.total, 1, 'bulk shipping lookup can resolve a KOC outside the visible first page')
  assert.equal(lookup.creators[0]!.creatorId, 'c199')
})
