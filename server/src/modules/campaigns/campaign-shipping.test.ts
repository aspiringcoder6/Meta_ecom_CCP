import assert from 'node:assert/strict'
import test from 'node:test'

process.env.DATABASE_URL ||= 'postgresql://test:test@127.0.0.1:1/test'
process.env.JWT_SECRET ||= 'shipping-tests-only'
const { validateShippingUpdate } = await import('./campaign-shipping.validation.js')
const { saveShipments } = await import('./campaign-shipping.service.js')

type RecordValue = Record<string, any>
function fixture() {
  const shipments: RecordValue[] = [], events: RecordValue[] = [], notifications: RecordValue[] = []
  const database = {
    $queryRaw: async (query: RecordValue) => String(query.sql).includes('COUNT(*)') ? [{ shipments: shipments.length, creators: shipments.length }] : [],
    campaignCreator: { findUnique: async ({ where }: RecordValue) => where.campaignId_creatorId.creatorId === 'foreign' ? null : { id: `assignment-${where.campaignId_creatorId.creatorId}`, clientDecision: 'APPROVED', kocDecision: 'APPROVED', creatorConfirmed: true } },
    campaignShipment: {
      findUnique: async ({ where }: RecordValue) => shipments.find((item) => item.id === where.id),
      create: async ({ data }: RecordValue) => { const value = { status: 'NOT_SENT', teamReceipt: 'UNCONFIRMED', carrier: '', trackingCode: '', note: '', sentDate: '', expectedDate: '', receivedDate: '', revision: 1, createdAt: new Date(), updatedAt: new Date(), ...structuredClone(data) }; shipments.push(value); return value },
      update: async ({ where, data }: RecordValue) => { const value = shipments.find((item) => item.id === where.id)!; Object.assign(value, { ...structuredClone(data), revision: value.revision + 1 }); return value },
    },
    shipmentEvent: { create: async ({ data }: RecordValue) => events.push({ id: String(events.length), ...structuredClone(data) }), findMany: async ({ where }: RecordValue) => events.filter((item) => item.shipmentId === where.shipmentId) },
    user: { findMany: async () => [{ id: 'admin' }, { id: 'manager' }] },
    notification: { upsert: async ({ where, create, update }: RecordValue) => { const old = notifications.find((item) => item.userId === where.userId_dedupeKey.userId && item.dedupeKey === where.userId_dedupeKey.dedupeKey); if (old) Object.assign(old, update); else notifications.push(create) } },
  }
  const client = { ...database, $transaction: async (action: (value: typeof database) => Promise<unknown>) => action(database) } as unknown as NonNullable<Parameters<typeof saveShipments>[3]>
  return { client, shipments, events, notifications }
}
const campaign = { id: 'campaign-db', externalId: 'CMP', name: 'Shipping Campaign' }
const brand = { name: 'Brand ABC', type: 'BRAND' as const }, team = { name: 'Manager', type: 'TEAM' as const }
const update = (index = 1) => ({ id: `shipment-test-${index}`, creatorId: `creator-${index}`, expectedRevision: 0, changes: { items: [{ product: 'Serum', quantity: 2, receivedQuantity: 0 }], status: 'SENT', trackingCode: `VD${index}` } })

test('shipping validates product quantities/dates, whitelists fields and protects team confirmation', () => {
  assert.throws(() => validateShippingUpdate({ ...update(), changes: { teamReceipt: 'CONFIRMED' } }, false), { code: 'SHIPMENT_CONFIRM_FORBIDDEN' })
  assert.throws(() => validateShippingUpdate({ ...update(), expectedRevision: -1 }, true), { code: 'INVALID_SHIPMENT' })
  assert.throws(() => validateShippingUpdate({ ...update(), changes: { sentDate: '2026-02-30' } }, true), { code: 'INVALID_SHIPMENT' })
  assert.throws(() => validateShippingUpdate({ ...update(), changes: { items: [{ product: 'Serum', quantity: 1, receivedQuantity: 2 }] } }, true), { code: 'INVALID_SHIPMENT' })
  assert.equal((validateShippingUpdate({ ...update(), changes: { ...update().changes, actualPrice: 1, confirmedBy: 'fake admin' } }, false).changes as RecordValue).confirmedBy, undefined)
})

test('Brand reports receipt separately from team confirmation; shipping changes invalidate old confirmation and retain audit history', async () => {
  const data = fixture()
  let result = await saveShipments(campaign, [update()], brand, data.client)
  assert.equal(result.savedCount, 1); assert.equal(result.saved[0]!.teamReceipt, 'UNCONFIRMED')
  result = await saveShipments(campaign, [{ ...update(), expectedRevision: 1, changes: { status: 'DELIVERED', items: [{ product: 'Serum', quantity: 2, receivedQuantity: 2 }] } }], brand, data.client)
  assert.equal(result.saved[0]!.revision, 2)
  assert.equal(result.saved[0]!.teamReceipt, 'UNCONFIRMED', 'Brand reported delivery is not a KOC confirmation')
  result = await saveShipments(campaign, [{ ...update(), expectedRevision: 2, changes: { teamReceipt: 'CONFIRMED' } }], team, data.client)
  assert.equal(result.saved[0]!.confirmedBy, 'Manager')
  result = await saveShipments(campaign, [{ ...update(), expectedRevision: 3, changes: { trackingCode: 'NEW-TRACKING' } }], brand, data.client)
  assert.equal(result.saved[0]!.teamReceipt, 'UNCONFIRMED')
  assert.equal(data.events.length, 4)
  assert.equal(data.notifications.length, 2, 'one aggregated notification per staff recipient, not one per keystroke')
})

test('stale edits conflict without overwriting, retries are idempotent, foreign KOCs and shipment IDs are rejected', async () => {
  const data = fixture()
  await saveShipments(campaign, [update()], brand, data.client)
  const retried = await saveShipments(campaign, [update()], brand, data.client)
  assert.equal(retried.savedCount, 1); assert.equal(retried.changedCount, 0); assert.equal(data.events.length, 1)
  const conflict = await saveShipments(campaign, [{ ...update(), changes: { note: 'Stale note' } }], brand, data.client)
  assert.equal(conflict.errors[0]!.code, 'SHIPMENT_CONFLICT')
  assert.equal(conflict.errors[0]!.current!.revision, 1)
  assert.equal(data.shipments[0]!.note, '')
  const foreign = await saveShipments(campaign, [{ ...update(2), creatorId: 'foreign' }, { ...update(), creatorId: 'different-creator' }], brand, data.client)
  assert.deepEqual(foreign.errors.map((item) => item.code), ['SHIPPING_KOC_NOT_ACCEPTED', 'SHIPMENT_SCOPE_MISMATCH'])
})

test('200 shipment updates skip bad rows, save all others and generate one summary per recipient', async () => {
  const data = fixture()
  const rows: RecordValue[] = Array.from({ length: 200 }, (_, index) => update(index))
  rows[49]!.changes.items[0].receivedQuantity = 3
  rows[50]!.creatorId = 'foreign'
  const result = await saveShipments(campaign, rows, brand, data.client)
  assert.equal(result.savedCount, 198); assert.equal(result.errors.length, 2)
  assert.equal(data.shipments.length, 198); assert.equal(data.events.length, 198)
  assert.equal(data.notifications.length, 2)
})
