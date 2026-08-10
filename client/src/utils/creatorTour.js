export const CREATOR_TOUR_EVENT = 'meta-ecom:start-creator-tour'
export const CREATOR_TOUR_PENDING_KEY = 'meta-ecom:creator-tour-pending'

export function requestCreatorTour() {
  window.dispatchEvent(new CustomEvent(CREATOR_TOUR_EVENT))
}
