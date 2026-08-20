import type { RequestHandler } from 'express'
import * as service from './notification.service.js'

export const list: RequestHandler = async (request, response) => response.json({ data: await service.listNotifications(request.auth!.user.id) })
export const markRead: RequestHandler = async (request, response) => response.json({ data: await service.markNotificationRead(request.auth!.user.id, String(request.params.id)) })
export const markAllRead: RequestHandler = async (request, response) => response.json({ data: await service.markAllNotificationsRead(request.auth!.user.id) })
