import assert from 'node:assert/strict'
import test from 'node:test'
import { sortCreators } from './creatorSorting.js'
import { canManageWorkspace } from '../config/permissions.js'

test('newest creators come first by original creation time, not by editing/import time', () => {
  const rows = [
    { id: 'old', createdAt: '2026-01-01', updatedAt: '2026-12-01', followers: 20 },
    { id: 'legacy', followers: 30 },
    { id: 'new', createdAt: '2026-10-09', followers: 10 },
  ]
  assert.deepEqual(sortCreators(rows, []).map(({ id }) => id), ['new', 'old', 'legacy'])
  assert.deepEqual(rows.map(({ id }) => id), ['old', 'legacy', 'new'], 'input is not mutated')
  assert.deepEqual(sortCreators(rows, [{ key: 'followers', direction: 'desc' }]).map(({ id }) => id), ['legacy', 'old', 'new'], 'chosen column sort takes precedence')
})

test('equal/missing timestamps retain stable relative order', () => {
  assert.deepEqual(sortCreators([{ id: 1 }, { id: 2 }, { id: 3, createdAt: 'invalid' }], []).map(({ id }) => id), [1, 2, 3])
})

test('Admin and Campaign Manager can manage workspace data but other roles cannot', () => {
  assert.equal(canManageWorkspace('ADMIN'), true)
  assert.equal(canManageWorkspace('CAMPAIGN_MANAGER'), true)
  for (const role of ['MEMBER', 'VIEWER', undefined]) assert.equal(canManageWorkspace(role), false)
})
