import { PrismaClient } from '../../generated/prisma/client.js'
import { env } from '../config/env.js'
import { createPrismaClient } from './create-prisma-client.js'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? createPrismaClient(env.databaseUrl, env.nodeEnv === 'development')

if (env.nodeEnv !== 'production') globalForPrisma.prisma = prisma
