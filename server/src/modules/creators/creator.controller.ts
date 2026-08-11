import type { RequestHandler } from 'express'
import { ApiError } from '../../utils/api-error.js'
import * as creatorService from './creator.service.js'

function queryText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function queryList(value: unknown) {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []
  const normalized = values.map((item) => typeof item === 'string' ? item.trim() : '').filter(Boolean)
  return normalized.length ? [...new Set(normalized)] : undefined
}

export const list: RequestHandler = async (request, response) => {
  let creators = await creatorService.listCreators({
    search: queryText(request.query.search), segment: queryList(request.query.segment), category: queryList(request.query.category),
    type: queryList(request.query.type), status: queryText(request.query.status),
  })
  if (request.auth?.user.role === 'VIEWER') {
    creators = creators.map((creator) => ({
      ...creator, contact: '', scope: '', concept: '', productFocus: '', mcnNote: '', email: '', phone: '', tiktokLink: '', historicalCampaign: '',
    }))
  }
  response.json({ data: creators, meta: { total: creators.length } })
}

export const metrics: RequestHandler = async (_request, response) => {
  response.json({ data: await creatorService.getCreatorMetrics() })
}

export const getOne: RequestHandler = async (request, response) => {
  response.json({ data: await creatorService.getCreator(String(request.params.id)) })
}

export const create: RequestHandler = async (request, response) => {
  response.status(201).json({ data: await creatorService.createCreator(request.body) })
}

export const update: RequestHandler = async (request, response) => {
  response.json({ data: await creatorService.updateCreator(String(request.params.id), request.body) })
}

export const remove: RequestHandler = async (request, response) => {
  await creatorService.deleteCreator(String(request.params.id))
  response.status(204).send()
}

export const importBatch: RequestHandler = async (request, response) => {
  const mode = request.body?.mode
  if (mode !== 'append' && mode !== 'replace') throw new ApiError(400, 'Mode import phải là append hoặc replace.', 'INVALID_IMPORT_MODE')
  response.json({ data: await creatorService.importCreators(request.body?.creators, mode) })
}

export const applyBatch: RequestHandler = async (request, response) => {
  response.json({ data: await creatorService.applyCreatorBatch(request.body || {}) })
}
