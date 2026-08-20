export function formatCampaignDate(value) {
  if (!value) return 'Chưa thiết lập'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

export function campaignProgress(campaign, now = new Date()) {
  const start = new Date(`${campaign.startDate}T00:00:00`).getTime()
  const end = new Date(`${campaign.endDate}T23:59:59`).getTime()
  const current = now.getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  if (current <= start) return 0
  if (current >= end) return 100
  return Math.round(((current - start) / (end - start)) * 100)
}

export function nextCampaignId(campaigns, date = new Date()) {
  const year = date.getFullYear()
  const prefix = `CMP-${year}-`
  const highest = campaigns.reduce((max, campaign) => {
    if (!String(campaign.id).startsWith(prefix)) return max
    const number = Number(String(campaign.id).slice(prefix.length))
    return Number.isFinite(number) ? Math.max(max, number) : max
  }, 0)
  return `${prefix}${String(highest + 1).padStart(3, '0')}`
}
