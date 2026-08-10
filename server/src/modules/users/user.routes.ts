import { Router } from 'express'
import { requireAuth, requireCsrf, requireRoles } from '../../middleware/auth.js'
import * as controller from './user.controller.js'

export const userRouter = Router()

userRouter.use(requireAuth, requireRoles('ADMIN'))
userRouter.get('/metrics', controller.metrics)
userRouter.get('/', controller.list)
userRouter.post('/', requireCsrf, controller.create)
userRouter.patch('/:id', requireCsrf, controller.update)
userRouter.delete('/:id', requireCsrf, controller.remove)
