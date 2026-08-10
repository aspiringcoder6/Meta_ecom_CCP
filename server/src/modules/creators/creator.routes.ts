import { Router } from 'express'
import * as controller from './creator.controller.js'
import { requireAuth, requireCsrf, requireRoles } from '../../middleware/auth.js'

export const creatorRouter = Router()

creatorRouter.use(requireAuth)
creatorRouter.get('/metrics', requireRoles('ADMIN', 'CAMPAIGN_MANAGER', 'MEMBER', 'VIEWER'), controller.metrics)
creatorRouter.post('/import', requireRoles('ADMIN'), requireCsrf, controller.importBatch)
creatorRouter.post('/batch', requireRoles('ADMIN'), requireCsrf, controller.applyBatch)
creatorRouter.get('/', requireRoles('ADMIN', 'CAMPAIGN_MANAGER', 'MEMBER', 'VIEWER'), controller.list)
creatorRouter.post('/', requireRoles('ADMIN'), requireCsrf, controller.create)
creatorRouter.get('/:id', requireRoles('ADMIN', 'CAMPAIGN_MANAGER', 'MEMBER'), controller.getOne)
creatorRouter.patch('/:id', requireRoles('ADMIN'), requireCsrf, controller.update)
creatorRouter.delete('/:id', requireRoles('ADMIN'), requireCsrf, controller.remove)
