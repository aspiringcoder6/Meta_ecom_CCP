import type { RequestHandler } from 'express'
import * as service from './user.service.js'
import { validateAdminCreate, validateAdminUpdate, validateUserFilters } from './user.validation.js'

export const list: RequestHandler = async (request, response) => {
  response.json({ data: await service.listUsers(validateUserFilters(request.query as Record<string, unknown>)) })
}

export const metrics: RequestHandler = async (_request, response) => {
  response.json({ data: await service.getUserMetrics() })
}

export const create: RequestHandler = async (request, response) => {
  response.status(201).json({ data: await service.createUser(validateAdminCreate(request.body), request.auth!.user.id) })
}

export const update: RequestHandler = async (request, response) => {
  response.json({ data: await service.updateUser(String(request.params.id), validateAdminUpdate(request.body), request.auth!.user.id) })
}

export const remove: RequestHandler = async (request, response) => {
  await service.deleteUser(String(request.params.id), request.auth!.user.id)
  response.status(204).send()
}
