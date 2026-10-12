import { Router } from 'express'
import * as controller from './creator.controller.js'
import { requireAuth, requireCsrf, requireRoles } from '../../middleware/auth.js'
import { DATA_MANAGER_ROLES } from '../../auth/roles.js'

export const creatorRouter = Router()

creatorRouter.use(requireAuth)
creatorRouter.get('/metrics', requireRoles('ADMIN', 'CAMPAIGN_MANAGER', 'MEMBER', 'VIEWER'), controller.metrics)
creatorRouter.post('/import', requireRoles(...DATA_MANAGER_ROLES), requireCsrf, controller.importBatch)
creatorRouter.post('/batch', requireRoles(...DATA_MANAGER_ROLES), requireCsrf, controller.applyBatch)
creatorRouter.get('/', requireRoles('ADMIN', 'CAMPAIGN_MANAGER', 'MEMBER', 'VIEWER'), controller.list)
creatorRouter.post('/', requireRoles(...DATA_MANAGER_ROLES), requireCsrf, controller.create)
creatorRouter.get('/:id', requireRoles('ADMIN', 'CAMPAIGN_MANAGER', 'MEMBER'), controller.getOne)
creatorRouter.patch('/:id', requireRoles(...DATA_MANAGER_ROLES), requireCsrf, controller.update)
creatorRouter.delete('/:id', requireRoles(...DATA_MANAGER_ROLES), requireCsrf, controller.remove)
