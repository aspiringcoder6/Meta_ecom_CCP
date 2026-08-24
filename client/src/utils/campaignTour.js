export const CAMPAIGN_TOUR_EVENT = 'meta-ecom:start-campaign-tour'

export function requestCampaignTour() {
  window.dispatchEvent(new CustomEvent(CAMPAIGN_TOUR_EVENT))
}
