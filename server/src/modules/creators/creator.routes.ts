import { Router } from 'express'
import * as controller from './creator.controller.js'

export const creatorRouter = Router()

creatorRouter.get('/metrics', controller.metrics)
creatorRouter.post('/import', controller.importBatch)
creatorRouter.post('/batch', controller.applyBatch)
creatorRouter.get('/', controller.list)
creatorRouter.post('/', controller.create)
creatorRouter.get('/:id', controller.getOne)
creatorRouter.patch('/:id', controller.update)
creatorRouter.delete('/:id', controller.remove)
