import 'dotenv/config'

function required(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export const env = {
  databaseUrl: process.env.DIRECT_URL || required('DATABASE_URL'),
  port: Number(process.env.PORT) || 4000,
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean),
  nodeEnv: process.env.NODE_ENV || 'development',
}
