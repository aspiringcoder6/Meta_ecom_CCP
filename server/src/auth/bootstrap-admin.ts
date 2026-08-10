import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma.js'
import { env } from '../config/env.js'

export async function ensureDefaultAdmin() {
  const values = [env.adminEmail, env.adminUsername, env.adminPassword]
  if (values.every((value) => !value)) {
    const message = 'Default Admin was not created. Set ADMIN_EMAIL, ADMIN_USERNAME, and ADMIN_PASSWORD.'
    if (env.nodeEnv === 'production') throw new Error(message)
    console.warn(message)
    return
  }
  if (values.some((value) => !value)) throw new Error('ADMIN_EMAIL, ADMIN_USERNAME, and ADMIN_PASSWORD must all be set together.')
  if (env.adminPassword.length < 12) throw new Error('ADMIN_PASSWORD must contain at least 12 characters.')

  const email = env.adminEmail.trim().toLowerCase()
  const username = env.adminUsername.trim().toLowerCase()
  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } })
  if (existing && existing.email !== email) throw new Error(`ADMIN_USERNAME is already used by ${existing.email}.`)
  const passwordMatches = existing?.passwordHash ? await bcrypt.compare(env.adminPassword, existing.passwordHash) : false
  const passwordHash = passwordMatches ? existing?.passwordHash : await bcrypt.hash(env.adminPassword, 12)

  await prisma.user.upsert({
    where: { email },
    update: {
      username, name: env.adminName, passwordHash, role: 'ADMIN', status: 'ACTIVE', provider: 'LOCAL',
      emailVerified: true, rejectionReason: null,
    },
    create: {
      email, username, name: env.adminName, passwordHash, role: 'ADMIN', status: 'ACTIVE', provider: 'LOCAL',
      emailVerified: true,
    },
  })
  console.log(`Default Admin ready: ${username}`)
}
