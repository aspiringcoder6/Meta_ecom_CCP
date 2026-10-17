import type { RequestHandler } from 'express'
import { brandCampaign, staffCampaign } from './brand-access.js'
import { brandWorkspace, staffShippingWorkspace } from './brand-workspace.service.js'
import { saveShipments, markShippingRead } from './campaign-shipping.service.js'
import { campaignRevision, streamCampaign } from './campaign-revision.js'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/api-error.js'

export const workspace: RequestHandler = async (req, res) => res.json({ data: await brandWorkspace(String(req.params.token), req.query) })
export const shippingWorkspace: RequestHandler = async (req, res) => res.json({ data: await staffShippingWorkspace(String(req.params.id), req.query, prisma, req.auth!.user.id) })
export const readShipping: RequestHandler = async (req, res) => res.json({ data: await markShippingRead(await staffCampaign(String(req.params.id)), req.auth!.user.id, req.body?.shipments) })
export const saveBrandShipping: RequestHandler = async (req, res) => {
  const { campaign } = await brandCampaign(String(req.params.token))
  res.json({ data: await saveShipments(campaign, req.body?.updates, { name: campaign.client, type: 'BRAND' }) })
}
export const saveTeamShipping: RequestHandler = async (req, res) => {
  const campaign = await staffCampaign(String(req.params.id))
  res.json({ data: await saveShipments(campaign, req.body?.updates, { name: req.auth!.user.name, type: 'TEAM' }) })
}
export const brandRevision: RequestHandler = async (req, res) => res.json({ data: { revision: await campaignRevision((await brandCampaign(String(req.params.token))).campaignId) } })
export const staffRevision: RequestHandler = async (req, res) => res.json({ data: { revision: await campaignRevision((await staffCampaign(String(req.params.id))).id) } })
export const brandEvents: RequestHandler = async (req, res) => streamCampaign(req, res, true)
export const staffEvents: RequestHandler = async (req, res) => streamCampaign(req, res, false)
export const shippingHistory: RequestHandler = async (req, res) => {
  const campaignId = req.params.token ? (await brandCampaign(String(req.params.token))).campaignId : (await staffCampaign(String(req.params.id))).id
  const shipment = await prisma.campaignShipment.findFirst({ where: { id: String(req.params.shipmentId), campaignCreator: { campaignId } }, select: { id: true } })
  if (!shipment) throw new ApiError(404, 'Không tìm thấy đợt giao hàng.', 'SHIPMENT_NOT_FOUND')
  res.json({ data: await prisma.shipmentEvent.findMany({ where: { shipmentId: shipment.id }, orderBy: { createdAt: 'desc' }, take: 50 }) })
}
