import { apiClient } from './apiClient'

export const campaignApi = {
  async list() {
    const response = await apiClient.get('/campaigns')
    return response.data.data
  },
  async get(campaignId) {
    const response = await apiClient.get(`/campaigns/${campaignId}`)
    return response.data.data
  },
  async create(campaign) {
    const response = await apiClient.post('/campaigns', campaign)
    return response.data.data
  },
  async addCreators(campaignId, creatorIds) {
    const response = await apiClient.post(`/campaigns/${campaignId}/creators`, { creatorIds })
    return response.data.data
  },
  async updateCreator(campaignId, creatorId, changes) {
    const response = await apiClient.patch(`/campaigns/${campaignId}/creators/${creatorId}`, changes)
    return response.data.data
  },
  async removeCreator(campaignId, creatorId) {
    const response = await apiClient.delete(`/campaigns/${campaignId}/creators/${creatorId}`)
    return response.data.data
  },
  async updateMilestones(campaignId, milestones) {
    const response = await apiClient.put(`/campaigns/${campaignId}/milestones`, { milestones })
    return response.data.data
  },
  async markClientChangesRead(campaignId) {
    const response = await apiClient.post(`/campaigns/${campaignId}/client-changes/read`)
    return response.data.data
  },
  async ensureReviewLink(campaignId) {
    const response = await apiClient.post(`/campaigns/${campaignId}/review-link`)
    return response.data.data
  },
}

export const publicReviewApi = {
  async get(token) {
    const response = await apiClient.get(`/public/reviews/${token}`)
    return response.data.data
  },
  async submit(token, responses) {
    const response = await apiClient.post(`/public/reviews/${token}`, { responses })
    return response.data.data
  },
}
