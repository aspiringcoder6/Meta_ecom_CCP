import { Router } from 'express'
import { creatorRouter } from '../modules/creators/creator.routes.js'
import { authRouter } from '../modules/auth/auth.routes.js'
import { userRouter } from '../modules/users/user.routes.js'
import { campaignRouter, publicReviewRouter } from '../modules/campaigns/campaign.routes.js'
import { notificationRouter } from '../modules/notifications/notification.routes.js'

export const apiRouter = Router()

apiRouter.use('/auth', authRouter)
apiRouter.use('/users', userRouter)
apiRouter.use('/creators', creatorRouter)
apiRouter.use('/campaigns', campaignRouter)
apiRouter.use('/notifications', notificationRouter)
apiRouter.use('/public/reviews', publicReviewRouter)
