import { app } from './app.js'
import { env } from './config/env.js'
import { prisma } from './lib/prisma.js'
import { ensureDefaultAdmin } from './auth/bootstrap-admin.js'

const server = await startServer()

async function startServer() {
  await ensureDefaultAdmin()
  return app.listen(env.port, () => {
    console.log(`Meta Ecom API listening on http://localhost:${env.port}`)
  })
}

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down...`)
  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
