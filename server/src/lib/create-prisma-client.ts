import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../generated/prisma/client.js'

export function createPrismaClient(connectionString: string, development = false) {
  const log = development ? ['warn', 'error'] as const : ['error'] as const
  if (connectionString.startsWith('prisma+postgres://')) return new PrismaClient({ accelerateUrl: connectionString, log: [...log] })
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }), log: [...log] })
}
