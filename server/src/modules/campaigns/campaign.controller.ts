import type { RequestHandler } from 'express'
import * as service from './campaign.service.js'
import { validateCampaignCreate, validateCampaignCreatorChanges, validateClientResponses, validateCreatorIds, validateMilestones } from './campaign.validation.js'

export const list: RequestHandler = async (_request, response) => response.json({ data: await service.listCampaigns() })
export const getOne: RequestHandler = async (request, response) => response.json({ data: await service.getCampaign(String(request.params.id)) })
export const create: RequestHandler = async (request, response) => response.status(201).json({ data: await service.createCampaign(validateCampaignCreate(request.body)) })
export const addCreators: RequestHandler = async (request, response) => response.json({ data: await service.addCreators(String(request.params.id), validateCreatorIds(request.body)) })
export const updateCreator: RequestHandler = async (request, response) => response.json({ data: await service.updateCampaignCreator(String(request.params.id), String(request.params.creatorId), validateCampaignCreatorChanges(request.body)) })
export const removeCreator: RequestHandler = async (request, response) => response.json({ data: await service.removeCreator(String(request.params.id), String(request.params.creatorId)) })
export const replaceMilestones: RequestHandler = async (request, response) => response.json({ data: await service.replaceMilestones(String(request.params.id), validateMilestones(request.body)) })
export const markClientChangesRead: RequestHandler = async (request, response) => response.json({ data: await service.markClientChangesRead(String(request.params.id)) })
export const ensureReviewLink: RequestHandler = async (request, response) => response.json({ data: await service.ensureReviewLink(String(request.params.id)) })
export const publicReview: RequestHandler = async (request, response) => response.json({ data: await service.getPublicReview(String(request.params.token)) })
export const submitPublicReview: RequestHandler = async (request, response) => response.json({ data: await service.submitPublicReview(String(request.params.token), validateClientResponses(request.body)) })
