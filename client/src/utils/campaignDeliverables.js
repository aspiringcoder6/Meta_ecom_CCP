import { effectiveClientDecision } from '../config/campaigns.js'

export function acceptedCampaignCreators(campaign) {
  return (campaign?.creators || []).filter((creator) => effectiveClientDecision(creator) === 'APPROVED' && (creator.kocDecision === 'APPROVED' || creator.creatorConfirmed))
}

export function campaignCreatorDeliverables(campaign, creator) {
  return creator?.deliverables?.length ? creator.deliverables : campaign?.deliverables || []
}

export function isFinalCampaignCreator(campaign, creator) {
  if (effectiveClientDecision(creator) !== 'APPROVED' || (creator.kocDecision !== 'APPROVED' && !creator.creatorConfirmed)) return false
  const deliverables = campaignCreatorDeliverables(campaign, creator)
  return deliverables.length > 0 && deliverables.every((item) => item.progress === 'Done' || item.status === 'COMPLETED')
}

export function finalCampaignCreators(campaign) {
  return (campaign?.creators || []).filter((creator) => isFinalCampaignCreator(campaign, creator))
}

export function deliverableFeedbackState(campaign) {
  return Object.fromEntries(acceptedCampaignCreators(campaign).flatMap((creator) => campaignCreatorDeliverables(campaign, creator).map((item) => [`${creator.creatorId}:${item.id}`, item.brandFeedback || ''])))
}
