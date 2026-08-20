import { prisma } from '../../lib/prisma.js'

async function ensureUpcomingMilestoneNotifications(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, name: true, username: true, email: true } })
  if (!user) return
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const soon = new Date(today)
  soon.setDate(soon.getDate() + 3)
  soon.setHours(23, 59, 59, 999)
  const milestones = await prisma.milestone.findMany({
    where: { dueDate: { gte: today, lte: soon }, status: { not: 'COMPLETED' } },
    include: { campaign: { select: { id: true, externalId: true, name: true, owner: true } } },
  })
  const identity = new Set([user.name, user.username, user.email].filter(Boolean).map((value) => String(value).trim().toLocaleLowerCase('vi')))
  const canSeeAll = user.role === 'ADMIN' || user.role === 'CAMPAIGN_MANAGER'
  const relevant = milestones.filter((milestone) => canSeeAll || identity.has(milestone.owner.trim().toLocaleLowerCase('vi')) || identity.has(milestone.campaign.owner.trim().toLocaleLowerCase('vi')))
  if (!relevant.length) return
  const existing = await prisma.notification.findMany({ where: { userId, icon: 'clock', campaignId: { in: relevant.map((milestone) => milestone.campaignId) } }, select: { message: true, detail: true, href: true } })
  const existingKeys = new Set(existing.map((notification) => `${notification.message}|${notification.detail}|${notification.href}`))
  const additions = relevant.flatMap((milestone) => {
    const message = `Milestone sắp đến hạn · ${milestone.title}`
    const detail = `${milestone.campaign.name} · ${milestone.dueDate.toISOString().slice(0, 10)}${milestone.owner ? ` · ${milestone.owner}` : ''}`
    const href = `/campaigns/${milestone.campaign.externalId}?tab=timeline`
    if (existingKeys.has(`${message}|${detail}|${href}`)) return []
    return [{ userId, campaignId: milestone.campaign.id, message, detail, icon: 'clock', href }]
  })
  if (additions.length) await prisma.notification.createMany({ data: additions })
}

function toDto(notification: { id: string; message: string; detail: string | null; icon: string; href: string | null; campaignId: string | null; read: boolean; createdAt: Date }) {
  return {
    id: notification.id, title: notification.message, detail: notification.detail || '', icon: notification.icon,
    href: notification.href, campaignId: notification.campaignId, unread: !notification.read, createdAt: notification.createdAt,
  }
}

export async function listNotifications(userId: string) {
  await ensureUpcomingMilestoneNotifications(userId)
  const notifications = await prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 40 })
  return notifications.map(toDto)
}

export async function markNotificationRead(userId: string, notificationId: string) {
  await prisma.notification.updateMany({ where: { id: notificationId, userId }, data: { read: true } })
  return listNotifications(userId)
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } })
  return listNotifications(userId)
}
