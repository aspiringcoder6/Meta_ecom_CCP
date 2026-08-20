import { Router } from 'express'
import { requireAuth, requireCsrf } from '../../middleware/auth.js'
import * as controller from './notification.controller.js'

export const notificationRouter = Router()
notificationRouter.use(requireAuth)
notificationRouter.get('/', controller.list)
notificationRouter.patch('/read-all', requireCsrf, controller.markAllRead)
notificationRouter.patch('/:id/read', requireCsrf, controller.markRead)
