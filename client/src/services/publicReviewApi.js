import axios from 'axios'
import { apiClient } from './apiClient'
import { loadPublicReview } from '../utils/publicReviewLoad'

// Brand uses a capability link, not a staff login/cookie or CSRF token.
export const publicClient = axios.create({
  baseURL: apiClient.defaults.baseURL, timeout: 120_000, withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
})

export const publicReviewApi = {
  workspace(token, query, options) {
    return loadPublicReview(async ({ signal }) => (await publicClient.get(`/public/reviews/${encodeURIComponent(token)}/workspace`, { params: query, signal, timeout: 90_000 })).data.data, options)
  },
  async revision(token) { return (await publicClient.get(`/public/reviews/${encodeURIComponent(token)}/revision`)).data.data },
  eventsUrl(token) { return `${publicClient.defaults.baseURL}/public/reviews/${encodeURIComponent(token)}/events` },
  async saveShipments(token, updates) { return (await publicClient.post(`/public/reviews/${encodeURIComponent(token)}/shipments`, { updates })).data.data },
  async shippingHistory(token, id) { return (await publicClient.get(`/public/reviews/${encodeURIComponent(token)}/shipments/${encodeURIComponent(id)}/history`)).data.data },
  get(token, options) {
    return loadPublicReview(async ({ signal }) => {
      const response = await publicClient.get(`/public/reviews/${encodeURIComponent(token)}`, { signal, timeout: 90_000 })
      return response.data.data
    }, options)
  },
  async submit(token, responses) {
    const response = await publicClient.post(`/public/reviews/${encodeURIComponent(token)}?compact=1`, { responses })
    return response.data.data
  },
  async submitDeliverables(token, updates) {
    const response = await publicClient.post(`/public/reviews/${encodeURIComponent(token)}/deliverables?compact=1`, { updates })
    return response.data.data
  },
}
