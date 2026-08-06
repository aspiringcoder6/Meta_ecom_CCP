import assert from 'node:assert/strict'
import test from 'node:test'
import { app } from './app.js'

test('health endpoint reports the API is ready', async () => {
  const server = app.listen(0)
  try {
    const address = server.address()
    assert.ok(address && typeof address === 'object')
    const response = await fetch(`http://127.0.0.1:${address.port}/api/health`)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { data: { status: 'ok', service: 'meta-ecom-api' } })
  } finally {
    server.close()
  }
})
