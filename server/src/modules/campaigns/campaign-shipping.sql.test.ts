import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile, readdir } from 'node:fs/promises'

process.env.DATABASE_URL ||= 'postgresql://test:test@127.0.0.1:1/test'
process.env.JWT_SECRET ||= 'shipping-sql-tests-only'

test('shipping migration preserves data; revision SQL/trigger handles bulk edits, shared profiles, shipments and unread markers', async (t) => {
  // Optional isolated PostgreSQL WASM used by Prisma Dev; never connect to .env databases.
  const packageName = '@electric-sql/pglite'
  const module = await import(packageName).catch(() => null)
  if (!module) { t.skip('PGlite is not installed; run this SQL integration check with Prisma Dev dependencies available'); return }
  const database = new module.PGlite()
  const { campaignRevision } = await import('./campaign-revision.js')
  const { updateReviewCreators } = await import('./campaign-review-batch.js')
  const { markShippingRead, unreadShipping } = await import('./campaign-shipping.service.js')
  try {
    const root = new URL('../../../prisma/migrations/', import.meta.url)
    const folders = (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()
    for (const folder of folders.filter((folder) => folder < '20261017100000_brand_shipping_workspace')) await database.exec(await readFile(new URL(`${folder}/migration.sql`, root), 'utf8'))
    await database.exec(`INSERT INTO "Campaign" ("id","externalId","name","client","startDate","endDate") VALUES ('campaign','CMP-SQL','SQL campaign','Brand','2026-10-01','2026-11-01');
      INSERT INTO "Creator" ("id","name","channelLink","tiktokId","updatedAt") VALUES ('creator','Creator','https://tiktok.com/@creator','creator','2026-10-01');
      INSERT INTO "CampaignCreator" ("id","campaignId","creatorId","clientNote","metaEcomNote") VALUES ('assignment','campaign','creator','keep Brand note','keep team note');`)
    await database.exec(await readFile(new URL('20261017100000_brand_shipping_workspace/migration.sql', root), 'utf8'))
    const row = (await database.query('SELECT * FROM "CampaignCreator"')).rows[0]
    assert.equal(row.clientNote, 'keep Brand note'); assert.equal(row.revision, 0)
    const adapter = { $queryRaw: async (query: { text: string; values: unknown[] }) => (await database.query(query.text, query.values)).rows,
      $executeRaw: async (query: { text: string; values: unknown[] }) => (await database.query(query.text, query.values.map((value) => value instanceof Date ? value.toISOString().replace('T', ' ').replace('Z', '') : value))).affectedRows,
      notification: { updateMany: async () => ({ count: 0 }) },
    }
    const revision = () => campaignRevision('campaign', adapter as unknown as Parameters<typeof campaignRevision>[1])
    const original = await revision()
    await database.exec('UPDATE "CampaignCreator" SET "clientChangeUnread"=true')
    assert.equal(await revision(), original, 'read/unread flags must not cause a refresh loop')
    await updateReviewCreators(adapter as unknown as Parameters<typeof updateReviewCreators>[0], 'campaign', [{ id: 'assignment', clientNote: 'new Brand note' }], new Date('2026-10-17T04:00:00Z'))
    const afterReview = await revision()
    assert.notEqual(afterReview, original)
    const updated = (await database.query('SELECT * FROM "CampaignCreator"')).rows[0]
    assert.equal(updated.revision, 1); assert.equal(updated.metaEcomNote, 'keep team note')
    await database.exec('UPDATE "CampaignCreator" SET "clientNote"=\'new Brand note\',"clientChangeUnread"=false')
    assert.equal(await revision(), afterReview, 'same values remain the same version')
    await database.exec('UPDATE "Creator" SET "followers"=123,"updatedAt"=\'2026-10-18\'')
    const afterProfile = await revision(); assert.notEqual(afterProfile, afterReview)
    await database.exec(`INSERT INTO "CampaignShipment" ("id","campaignCreatorId","updatedBy","updatedByType") VALUES ('shipment','assignment','Brand','BRAND')`)
    const afterShipping = await revision(); assert.notEqual(afterShipping, afterProfile)
    await database.exec('UPDATE "CampaignShipment" SET "revision"=2,"trackingCode"=\'VD001\'')
    assert.notEqual(await revision(), afterShipping)
    await database.exec(`INSERT INTO "User" ("id","email","name","updatedAt") VALUES ('staff1','staff1@test.invalid','Staff One',CURRENT_TIMESTAMP),('staff2','staff2@test.invalid','Staff Two',CURRENT_TIMESTAMP);
      UPDATE "CampaignShipment" SET "lastBrandRevision"=2;`)
    const readDatabase = adapter as unknown as NonNullable<Parameters<typeof markShippingRead>[3]>
    assert.equal((await unreadShipping('campaign', 'staff1', readDatabase)).shipments, 1)
    await markShippingRead({ id: 'campaign', name: 'Campaign' }, 'staff1', [{ id: 'shipment', revision: 2 }], readDatabase)
    assert.equal((await unreadShipping('campaign', 'staff1', readDatabase)).shipments, 0)
    assert.equal((await unreadShipping('campaign', 'staff2', readDatabase)).shipments, 1, 'one user cannot clear another user’s unread changes')
    await database.exec('UPDATE "CampaignShipment" SET "lastBrandRevision"=3,"revision"=3')
    await markShippingRead({ id: 'campaign', name: 'Campaign' }, 'staff1', [{ id: 'shipment', revision: 2 }], readDatabase)
    assert.equal((await unreadShipping('campaign', 'staff1', readDatabase)).shipments, 1, 'a delayed acknowledgement cannot hide a newer Brand update')
    await database.exec('DELETE FROM "CampaignCreator" WHERE "id"=\'assignment\'')
    assert.equal((await database.query('SELECT COUNT(*)::int AS count FROM "CampaignShipment"')).rows[0].count, 0, 'deleting an assignment cascades shipments')
  } finally { await database.close() }
})
