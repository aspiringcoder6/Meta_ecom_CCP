import { Prisma } from '../../../generated/prisma/client.js'
import type { Request, Response } from 'express'
import { prisma } from '../../lib/prisma.js'
import { brandCampaign, staffCampaign } from './brand-access.js'

export async function campaignRevision(campaignId: string, database = prisma) {
  // Hash small scalar versions, not complete campaign/deliverable payloads.
  const rows = await database.$queryRaw<{ revision: string }[]>(Prisma.sql`
    SELECT md5(concat_ws('|', c."updatedAt"::text,
      (SELECT string_agg(cc."id" || ':' || cc."revision" || ':' || cr."updatedAt"::text, ',' ORDER BY cc."id")
       FROM "CampaignCreator" cc JOIN "Creator" cr ON cr."id" = cc."creatorId" WHERE cc."campaignId" = c."id"),
      (SELECT string_agg(m."id" || ':' || m."title" || ':' || m."dueDate"::text || ':' || m."owner" || ':' || m."status", ',' ORDER BY m."id") FROM "Milestone" m WHERE m."campaignId" = c."id"),
      (SELECT string_agg(s."id" || ':' || s."revision", ',' ORDER BY s."id") FROM "CampaignShipment" s
       JOIN "CampaignCreator" cc ON cc."id" = s."campaignCreatorId" WHERE cc."campaignId" = c."id")
    )) AS revision FROM "Campaign" c WHERE c."id" = ${campaignId}
  `)
  return rows[0]?.revision || 'deleted'
}

// One DB check per watched campaign (not per browser). Each browser receives
// just a short version event and fetches data only when the version changes.
type Listener = (revision: string) => void
const channels = new Map<string, { listeners: Set<Listener>; timer: ReturnType<typeof setInterval>; revision: string; busy: boolean }>()
function subscribe(campaignId: string, listener: Listener) {
  let channel = channels.get(campaignId)
  if (!channel) {
    channel = { listeners: new Set(), timer: undefined!, revision: '', busy: false }
    const tick = async () => {
      if (channel!.busy) return
      channel!.busy = true
      try {
        const revision = await campaignRevision(campaignId)
        if (revision !== channel!.revision) { channel!.revision = revision; channel!.listeners.forEach((notify) => notify(revision)) }
      } catch { /* Keep the stream open through transient DB outages. */ }
      finally { channel!.busy = false }
    }
    channel.timer = setInterval(tick, 4000)
    channel.timer.unref()
    channels.set(campaignId, channel)
    void tick()
  }
  channel.listeners.add(listener)
  if (channel.revision) listener(channel.revision)
  return () => {
    channel!.listeners.delete(listener)
    if (!channel!.listeners.size) { clearInterval(channel!.timer); channels.delete(campaignId) }
  }
}

export async function streamCampaign(request: Request, response: Response, isBrand: boolean) {
  const token = String(request.params.token || '')
  const campaignId = isBrand ? (await brandCampaign(token)).campaignId : (await staffCampaign(String(request.params.id))).id
  response.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' })
  response.flushHeaders()
  const unsubscribe = subscribe(campaignId, (revision) => response.write(`event: revision\ndata: ${JSON.stringify({ revision })}\n\n`))
  let checking = false
  const heartbeat = setInterval(async () => {
    if (checking) return
    checking = true
    try {
      // Capability links must stop receiving events after revocation.
      if (isBrand) await brandCampaign(token)
      response.write(': heartbeat\n\n')
    } catch { response.write('event: expired\ndata: {}\n\n'); response.end() }
    finally { checking = false }
  }, 30000)
  heartbeat.unref()
  // Periodic reconnect also re-runs staff authentication/role checks.
  const renew = setTimeout(() => response.end(), 120000)
  renew.unref()
  response.on('close', () => { unsubscribe(); clearInterval(heartbeat); clearTimeout(renew) })
}
