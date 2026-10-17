import assert from 'node:assert/strict'
import test from 'node:test'
import type { AddressInfo } from 'node:net'

// No real database is used, including when a developer has production URLs in .env.
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/test'
process.env.DIRECT_URL = process.env.DATABASE_URL
process.env.JWT_SECRET = 'workspace-access-test-only-secret'
process.env.NODE_ENV = 'test'
const unexpected = async () => { throw new Error('Unexpected database access in route test') }
const prisma = {
  user: { findUnique: unexpected }, creator: { findMany: unexpected },
  campaignCreator: { count: unexpected }, reviewLink: { findUnique: unexpected },
  campaign: { findFirst: unexpected }, $transaction: unexpected, $queryRaw: unexpected,
}
// Inject a plain in-memory client before loading any route/service.
;(globalThis as { prisma?: unknown }).prisma = prisma
const { app } = await import('../app.js')
const { AUTH_COOKIE, createSessionToken } = await import('./token.js')
const roles = ['ADMIN', 'CAMPAIGN_MANAGER', 'MEMBER', 'VIEWER'] as const

test('workspace writes allow Admin/Manager but preserve account administration and CSRF boundaries', async (t) => {
  t.mock.method(prisma.user, 'findUnique', async ({ where }: { where: { id: string } }) => ({
    id: where.id, role: where.id, status: 'ACTIVE', tokenVersion: 0, name: 'Test user',
    email: 'test@example.com', username: null, avatarUrl: null, department: null,
  }))
  t.mock.method(prisma.creator, 'findMany', async () => [])
  t.mock.method(prisma.campaignCreator, 'count', async () => 1)
  t.mock.method(prisma.campaign, 'findFirst', async () => ({ id: 'campaign-db', externalId: 'CMP-TEST', name: 'Test Campaign', client: 'Brand' }))
  t.mock.method(prisma, '$transaction', async (action: (tx: typeof prisma) => Promise<unknown>) => action(prisma))
  const server = app.listen(0)
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`
  const writes = [
    { path: '/creators', method: 'POST', status: 422 },
    { path: '/creators/import', method: 'POST', status: 400 },
    { path: '/creators/batch', method: 'POST', status: 200 },
    { path: '/creators/test-id', method: 'PATCH', status: 400 },
    { path: '/creators/test-id', method: 'DELETE', status: 409 },
    { path: '/campaigns/CMP-TEST/creators/import', method: 'POST', status: 400 },
    { path: '/campaigns/CMP-TEST/shipments', method: 'POST', status: 422 },
  ]
  try {
    for (const role of roles) await t.test(role, async () => {
      const session = createSessionToken({ id: role, role, tokenVersion: 0 })
      const headers = { cookie: `${AUTH_COOKIE}=${session.token}`, 'x-csrf-token': session.csrfToken, 'content-type': 'application/json' }
      for (const route of writes) {
        // Empty input reaches validation/service only for authorized roles.
        const response = await fetch(`${origin}${route.path}`, { method: route.method, headers, body: '{}' })
        const allowed = role === 'ADMIN' || role === 'CAMPAIGN_MANAGER'
        assert.equal(response.status, allowed ? route.status : 403, `${role}: ${route.method} ${route.path}`)
        if (!allowed) assert.equal((await response.json()).error.code, 'FORBIDDEN')
      }
      if (role !== 'ADMIN') {
        for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
          const response = await fetch(`${origin}/users${['PATCH', 'DELETE'].includes(method) ? '/other-user' : ''}`, {
            method, headers, ...(method !== 'GET' ? { body: '{}' } : {}),
          })
          assert.equal(response.status, 403, `${role} cannot administer accounts via ${method}`)
          assert.equal((await response.json()).error.code, 'FORBIDDEN')
        }
      }
      if (role === 'ADMIN' || role === 'CAMPAIGN_MANAGER') {
        for (const route of writes) {
          const response = await fetch(`${origin}${route.path}`, { method: route.method, headers: { ...headers, 'x-csrf-token': '' }, body: '{}' })
          assert.equal(response.status, 403)
          assert.equal((await response.json()).error.code, 'INVALID_CSRF_TOKEN')
        }
      }
    })
    assert.equal((await fetch(`${origin}/creators`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 401)
  } finally { server.close(); t.mock.restoreAll() }
})

test('Brand review is public even without staff cookies or with a stale staff session', async (t) => {
  const campaign = { id: 'campaign-db', externalId: 'CMP-PUBLIC', name: 'Public Campaign', client: 'Brand',
    owner: 'Manager', status: 'DRAFT', category: [], segmentGoals: {}, creators: [], milestones: [],
    defaultDeliverables: [], budget: 0, reviewLinks: [] }
  const authLookup = t.mock.method(prisma.user, 'findUnique', () => { throw new Error('Public review must not check staff login') })
  t.mock.method(prisma.reviewLink, 'findUnique', async ({ where }: { where: { token: string } }) => where.token === 'public-token'
    ? { token: where.token, campaignId: campaign.id, revoked: false, expiresAt: null, campaign } : null)
  t.mock.method(prisma.campaign, 'findFirst', async () => campaign)
  t.mock.method(prisma.creator, 'findMany', async () => [])
  t.mock.method(prisma, '$queryRaw', async () => [{ revision: 'test-version' }])
  const server = app.listen(0)
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/public/reviews`
  try {
    for (const cookie of ['', `${AUTH_COOKIE}=expired-staff-session`]) {
      const headers = { cookie, 'content-type': 'application/json' }
      for (const action of [{ path: '', method: 'GET' }, { path: '', method: 'POST', body: { responses: [] } }, { path: '/deliverables', method: 'POST', body: { updates: [] } }]) {
        const response = await fetch(`${url}/public-token${action.path}`, { method: action.method, headers, ...(action.body ? { body: JSON.stringify(action.body) } : {}) })
        assert.equal(response.status, 200)
        assert.equal((await response.json()).data.id, 'CMP-PUBLIC')
      }
    }
    assert.equal(authLookup.mock.callCount(), 0)
    const shipping = await fetch(`${url}/public-token/shipments`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"updates":[]}' })
    assert.equal(shipping.status, 422, 'public shipping reaches validation without a staff login/CSRF')
    const controller = new AbortController()
    const stream = await fetch(`${url}/public-token/events`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]) })
    assert.equal(stream.status, 200)
    assert.match(stream.headers.get('content-type')!, /text\/event-stream/)
    const chunk = await stream.body!.getReader().read()
    assert.match(new TextDecoder().decode(chunk.value), /test-version/)
    controller.abort()
    const response = await fetch(`${url}/unknown-token`)
    assert.equal(response.status, 404)
    assert.equal((await response.json()).error.code, 'REVIEW_LINK_INVALID')
  } finally { server.close(); t.mock.restoreAll() }
})
