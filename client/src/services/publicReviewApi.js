import axios from 'axios'
import { apiClient } from './apiClient'
import { loadPublicReview } from '../utils/publicReviewLoad'

// Brand uses a capability link, not a staff login/cookie or CSRF token.
const publicClient = axios.create({
  baseURL: apiClient.defaults.baseURL, timeout: 120_000, withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
})

export const publicReviewApi = {
  get(token, options) {
    return loadPublicReview(async ({ signal }) => {
      const response = await publicClient.get(`/public/reviews/${encodeURIComponent(token)}`, { signal, timeout: 90_000 })
      return response.data.data
    }, options)
  },
  async submit(token, responses) {
    const response = await publicClient.post(`/public/reviews/${encodeURIComponent(token)}`, { responses })
    return response.data.data
  },
  async submitDeliverables(token, updates) {
    const response = await publicClient.post(`/public/reviews/${encodeURIComponent(token)}/deliverables`, { updates })
    return response.data.data
  },
}
