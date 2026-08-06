import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { errorHandler } from './middleware/error-handler.js'
import { notFound } from './middleware/not-found.js'
import { apiRouter } from './routes/index.js'

export const app = express()

app.disable('x-powered-by')
app.use(cors({ origin: env.clientOrigins, credentials: true }))
app.use(express.json({ limit: '8mb' }))

app.get('/api/health', (_request, response) => response.json({ data: { status: 'ok', service: 'meta-ecom-api' } }))
app.use('/api', apiRouter)
app.use(notFound)
app.use(errorHandler)
