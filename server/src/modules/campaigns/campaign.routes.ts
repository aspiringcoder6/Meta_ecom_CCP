import { Router } from 'express'
import { requireAuth, requireCsrf, requireRoles } from '../../middleware/auth.js'
import * as controller from './campaign.controller.js'

export const publicReviewRouter = Router()
publicReviewRouter.get('/:token', controller.publicReview)
publicReviewRouter.post('/:token', controller.submitPublicReview)

export const campaignRouter = Router()
campaignRouter.use(requireAuth, requireRoles('ADMIN', 'CAMPAIGN_MANAGER', 'MEMBER'))
campaignRouter.get('/', controller.list)
campaignRouter.post('/', requireRoles('ADMIN', 'CAMPAIGN_MANAGER'), requireCsrf, controller.create)
campaignRouter.get('/:id', controller.getOne)
campaignRouter.post('/:id/creators', requireRoles('ADMIN', 'CAMPAIGN_MANAGER'), requireCsrf, controller.addCreators)
campaignRouter.patch('/:id/creators/:creatorId', requireRoles('ADMIN', 'CAMPAIGN_MANAGER'), requireCsrf, controller.updateCreator)
campaignRouter.delete('/:id/creators/:creatorId', requireRoles('ADMIN', 'CAMPAIGN_MANAGER'), requireCsrf, controller.removeCreator)
campaignRouter.put('/:id/milestones', requireRoles('ADMIN', 'CAMPAIGN_MANAGER'), requireCsrf, controller.replaceMilestones)
campaignRouter.post('/:id/client-changes/read', requireCsrf, controller.markClientChangesRead)
campaignRouter.post('/:id/review-link', requireRoles('ADMIN', 'CAMPAIGN_MANAGER'), requireCsrf, controller.ensureReviewLink)
