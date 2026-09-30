import assert from 'node:assert/strict'
import test from 'node:test'
import Papa from 'papaparse'
import { INTERNAL_FILE_COLUMNS, internalListingExportRows, parseInternalListingRows } from './campaignInternalFiles.js'

const headers = INTERNAL_FILE_COLUMNS.map(([header]) => header)
const row = (values) => INTERNAL_FILE_COLUMNS.map(([, field]) => values[field] ?? '')
const existing = { id: 'creator-1', tiktokId: 'alice', tiktokLink: 'https://www.tiktok.com/@alice', category: ['FASHION > Female'], type: ['VIDEO'], segment: 'TOP', followers: 150, cost: 1e6, extraCost: 100000, gmvMonth: 1e7, contact: 'hello', mcnNote: 'master note' }

test('Internal import recognizes campaign updates, existing additions and new creators', () => {
  const parsed = parseInternalListingRows([headers, row({ ...existing, tiktokId: '@ALICE', segment: 'Top KOC', cost: '2.000.000', extraCost: '2,000,000', gmvMonth: '18,78M', followers: '202,56k', category: 'abc > cde, fgh', type: 'livestream, video' }), row({ tiktokId: 'bob', tiktokLink: 'bob link' })], [existing], [{ creatorId: existing.id }])
  assert.equal(parsed[0].action, 'update')
  assert.equal(parsed[1].action, 'create')
  assert.equal(parsed[0].values.cost, 2e6)
  assert.equal(parsed[0].values.extraCost, 2e6)
  assert.equal(parsed[0].values.gmvMonth, 18780000)
  assert.equal(parsed[0].values.followers, 202560)
  assert.deepEqual(parsed[0].values.category, ['abc > cde', 'abc > fgh'])
  assert.deepEqual(parsed[0].values.type, ['LIVESTREAM', 'VIDEO'])
  assert.equal(parsed[0].values.segment, 'TOP')
  assert.equal(parseInternalListingRows([headers, row(existing)], [existing])[0].action, 'add')
})

test('invalid rows are red/skip candidates and do not consume a valid identity', () => {
  const parsed = parseInternalListingRows([headers,
    row({ ...existing, followers: -1 }), row(existing), row({ ...existing, tiktokId: '@ALICE' }),
    row({ tiktokId: 'empty-link' }), row({ tiktokId: 'overflow', tiktokLink: 'anything', followers: 2147483648 }),
    row({ tiktokId: 'bad-type', tiktokLink: 'other', type: 'unknown' }),
  ])
  assert.deepEqual(parsed.map((item) => item.action), ['skip', 'create', 'skip', 'skip', 'skip', 'skip'])
  assert.match(parsed[2].errors[0], /trùng trong file/)
})

test('does not create a second profile for link matches or ambiguous identity', () => {
  assert.equal(parseInternalListingRows([headers, row({ ...existing, tiktokId: 'different id', tiktokLink: 'http://tiktok.com/@alice/' })], [existing])[0].action, 'add')
  const other = { ...existing, id: 'creator-2', tiktokId: 'bob', tiktokLink: 'https://tiktok.com/@bob' }
  assert.equal(parseInternalListingRows([headers, row({ ...existing, tiktokLink: other.tiktokLink })], [existing, other])[0].action, 'skip')
})

test('export has campaign prices, computed totals, PIC and CSV roundtrips quoted notes', () => {
  const campaign = { creators: [{ creatorId: existing.id, quotedCost: 0, quotedExtraCost: 2e6, scope: 'Campaign scope', pic: 'Owner' }] }
  const source = { ...existing, mcnNote: 'Ghi chú, có "ngoặc"\nvà xuống dòng' }
  const exported = internalListingExportRows(campaign, [source])
  assert.equal(exported[0][7], 0)
  assert.equal(exported[0][8], 2e6)
  assert.equal(exported[0][14], 'Owner')
  assert.equal(exported[0][9], 2e6)
  const csv = Papa.unparse([headers, ...exported], { escapeFormulae: true })
  const parsed = parseInternalListingRows(Papa.parse(csv).data, [source], campaign.creators)
  assert.equal(parsed[0].action, 'update')
  assert.equal(parsed[0].values.mcnNote, source.mcnNote)
  assert.equal(parsed[0].values.cost, 0)
  assert.equal(parsed[0].values.totalCast, undefined)
})

test('blank optional cells preserve existing data and blank workbook has useful error', () => {
  const parsed = parseInternalListingRows([headers, row({ tiktokId: 'bob', tiktokLink: 'anything' })])
  assert.equal(parsed[0].values.followers, undefined)
  assert.equal(parsed[0].values.cost, undefined)
  assert.equal(parsed[0].values.category, undefined)
  assert.throws(() => parseInternalListingRows([headers]), /chưa có dữ liệu/)
  assert.throws(() => parseInternalListingRows([['ID TikTok'], ['bob']]), /Link TikTok/)
})
