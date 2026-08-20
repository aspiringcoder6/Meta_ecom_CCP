export const CAMPAIGN_STORAGE_KEY = 'meta-ecom-campaigns-v2'
const LEGACY_SESSION_KEY = 'meta-ecom-campaign-demo-v1'

function parseCampaigns(value) {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function readStoredCampaigns(fallback = []) {
  const saved = parseCampaigns(window.localStorage.getItem(CAMPAIGN_STORAGE_KEY))
  if (saved) return saved
  const legacy = parseCampaigns(window.sessionStorage.getItem(LEGACY_SESSION_KEY))
  return legacy || fallback
}

export function writeStoredCampaigns(campaigns) {
  window.localStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(campaigns))
}

function hashText(value) {
  let hash = 2166136261
  for (const character of value) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash >>> 0).toString(36)
}

export function campaignReviewToken(campaign) {
  return campaign.reviewToken || `${campaign.id.toLowerCase()}-${hashText(`${campaign.id}:${campaign.createdAt || campaign.client}`)}`
}

export function findCampaignByReviewToken(campaigns, token) {
  return campaigns.find((campaign) => campaignReviewToken(campaign) === token)
}
