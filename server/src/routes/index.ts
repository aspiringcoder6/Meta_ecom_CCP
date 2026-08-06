import { Router } from 'express'
import { creatorRouter } from '../modules/creators/creator.routes.js'

export const apiRouter = Router()

apiRouter.use('/creators', creatorRouter)
