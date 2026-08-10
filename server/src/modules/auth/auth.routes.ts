import { Router } from 'express'
import { requireAuth, requireCsrf } from '../../middleware/auth.js'
import * as controller from './auth.controller.js'

export const authRouter = Router()

authRouter.post('/signup', controller.signup)
authRouter.post('/login', controller.login)
authRouter.post('/google', controller.google)
authRouter.get('/me', requireAuth, controller.me)
authRouter.post('/logout', requireAuth, requireCsrf, controller.logout)
