import assert from 'node:assert/strict'
import test from 'node:test'
import { validateInternalImport } from './campaign-import.validation.js'

process.env.DATABASE_URL ||= 'postgresql://test:test@127.0.0.1:1/test'
process.env.JWT_SECRET ||= 'test-only-secret-not-used-for-sessions'
const { importInternalListings } = await import('./campaign-import.service.js')

type RecordRow = Record<string, any>

function fixture() {
  const source: RecordRow = { id: 'alice-id', name: 'Alice', tiktokId: 'alice', tiktokLink: 'https://tiktok.com/@alice', category: ['abc > old'], type: ['VIDEO'], segment: 'TOP', cost: 1e6, extraCost: 500000, followers: 100, gmvMonth: 2e6, contact: 'old contact', mcnNote: 'old note' }
  const creators = new Map<string, RecordRow>([[source.id, source]])
  const assignment: RecordRow = { id: 'assignment-id', campaignId: 'campaign-id', creatorId: source.id, quotedCost: 9e6, quotedExtraCost: 1e6, scope: 'old scope', pic: 'Old PIC', clientDecision: 'APPROVED', creatorConfirmed: true, deliverablesData: [{ id: 'deliverable-1', status: 'Done' }] }
  const assignments = new Map<string, RecordRow>([[source.id, assignment]])
  const campaign = { id: 'campaign-id', externalId: 'CMP-TEST', defaultDeliverables: [{ type: 'VIDEO', progress: 'Đang liên hệ' }] }
  const tx = {
    creator: {
      findUniqueOrThrow: async ({ where }: RecordRow) => creators.get(where.id),
      create: async ({ data }: RecordRow) => { const saved = { ...data, id: `new-${creators.size}` }; creators.set(saved.id, saved); return saved },
      update: async ({ where, data }: RecordRow) => { const saved = { ...creators.get(where.id), ...data }; creators.set(saved.id, saved); return saved },
    },
    campaignCreator: {
      findUnique: async ({ where }: RecordRow) => assignments.get(where.campaignId_creatorId.creatorId) || null,
      create: async ({ data }: RecordRow) => { const saved = { ...data, id: `assignment-${assignments.size}` }; assignments.set(saved.creatorId, saved); return saved },
      update: async ({ where, data }: RecordRow) => { const old = [...assignments.values()].find((item) => item.id === where.id)!; assignments.set(old.creatorId, { ...old, ...data }); return assignments.get(old.creatorId) },
    },
  }
  const database = {
    campaign: { findFirst: async () => campaign },
    creator: { findMany: async ({ where }: RecordRow = {}) => [...creators.values()].filter((creator) => !where || where.id.in.includes(creator.id)) },
    $transaction: async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx),
  } as unknown as NonNullable<Parameters<typeof importInternalListings>[2]>
  const loadCampaign = (async () => ({ id: campaign.externalId, creators: [...assignments.values()] })) as unknown as NonNullable<Parameters<typeof importInternalListings>[3]>
  return { creators, assignments, source, database, loadCampaign }
}

test('import commits valid rows, synchronizes profiles and preserves campaign approval/deliverables', async () => {
  const data = fixture()
  const result = await importInternalListings('CMP-TEST', validateInternalImport({ rows: [
    { rowNumber: 2, values: { tiktokId: '@ALICE', tiktokLink: data.source.tiktokLink, cost: 0, extraCost: 2e6, followers: 333, contact: 'new contact', category: ['abc > new'], type: ['LIVESTREAM'], scope: 'new scope', pic: 'New PIC' } },
    { rowNumber: 3, values: { tiktokId: 'bob', tiktokLink: 'anything', cost: 3e6 } },
    { rowNumber: 4, values: { tiktokId: 'invalid', tiktokLink: 'bad', followers: -5 } },
    { rowNumber: 5, values: { tiktokId: 'alice', tiktokLink: data.source.tiktokLink } },
  ] }), data.database, data.loadCampaign)
  assert.equal(result.createdCount, 1)
  assert.equal(result.addedCount, 1)
  assert.equal(result.updatedCount, 1)
  assert.equal(result.skippedCount, 2)
  assert.equal(data.creators.size, 2)
  const alice = data.creators.get('alice-id')!
  assert.equal(alice.cost, 1e6, 'existing master price stays unchanged')
  assert.equal(alice.extraCost, 500000)
  assert.equal(alice.followers, 333)
  assert.equal(alice.contact, 'new contact')
  assert.deepEqual(alice.category, ['abc > old', 'abc > new'])
  assert.deepEqual(alice.type, ['VIDEO', 'LIVESTREAM'])
  const assigned = data.assignments.get('alice-id')!
  assert.equal(assigned.quotedCost, 0)
  assert.equal(assigned.quotedExtraCost, 2e6)
  assert.equal(assigned.scope, 'new scope')
  assert.equal(assigned.pic, 'New PIC')
  assert.equal(assigned.clientDecision, 'APPROVED')
  assert.equal(assigned.creatorConfirmed, true)
  assert.deepEqual(assigned.deliverablesData, [{ id: 'deliverable-1', status: 'Done' }])
  const bob = [...data.creators.values()].find((creator) => creator.tiktokId === 'bob')!
  assert.equal(bob.segment, 'MINI')
  assert.deepEqual(bob.category, ['OTHER'])
  assert.equal(bob.historicalCampaign, 'Đã hợp tác')
  assert.equal(data.assignments.get(bob.id)!.quotedCost, 3e6)
  assert.deepEqual(data.assignments.get(bob.id)!.deliverablesData, [{ type: 'VIDEO', progress: 'Đang liên hệ' }])
  assert.equal(result.creators.length, 2)
})

test('matching by link reuses existing profile and blank cells do not clear campaign or master fields', async () => {
  const data = fixture()
  const result = await importInternalListings('CMP-TEST', validateInternalImport({ rows: [
    { values: { tiktokId: 'different alias', tiktokLink: 'http://www.tiktok.com/@alice/', cost: '', contact: '', scope: '' } },
  ] }), data.database, data.loadCampaign)
  assert.equal(result.updatedCount, 1)
  assert.equal(result.createdCount, 0)
  assert.equal(data.creators.get('alice-id')!.tiktokId, 'alice')
  assert.equal(data.creators.get('alice-id')!.contact, 'old contact')
  assert.equal(data.assignments.get('alice-id')!.quotedCost, 9e6)
  assert.equal(data.assignments.get('alice-id')!.scope, 'old scope')
})

test('ambiguous identity is skipped while valid existing creator is added to campaign', async () => {
  const data = fixture()
  data.creators.set('bob-id', { ...data.source, id: 'bob-id', tiktokId: 'bob', tiktokLink: 'bob link' })
  const result = await importInternalListings('CMP-TEST', validateInternalImport({ rows: [
    { values: { tiktokId: 'alice', tiktokLink: 'bob link' } },
    { values: { tiktokId: 'bob', tiktokLink: 'bob link' } },
  ] }), data.database, data.loadCampaign)
  assert.equal(result.skippedCount, 1)
  assert.equal(result.addedCount, 1)
  assert.equal(result.createdCount, 0)
  assert.equal(data.assignments.size, 2)
  assert.match(result.errors[0]!.message, /nhiều hồ sơ/)
})
