import { apiClient } from './apiClient'

export const campaignApi = {
  async revision(id) { return (await apiClient.get(`/campaigns/${encodeURIComponent(id)}/revision`)).data.data },
  eventsUrl(id) { return `${apiClient.defaults.baseURL}/campaigns/${encodeURIComponent(id)}/events` },
  async shipping(id, query) { return (await apiClient.get(`/campaigns/${encodeURIComponent(id)}/shipments`, { params: query })).data.data },
  async readShipments(id, shipments) { return (await apiClient.post(`/campaigns/${encodeURIComponent(id)}/shipments/read`, { shipments })).data.data },
  async saveShipments(id, updates) { return (await apiClient.post(`/campaigns/${encodeURIComponent(id)}/shipments`, { updates }, { timeout: 120_000 })).data.data },
  async shippingHistory(id, shipmentId) { return (await apiClient.get(`/campaigns/${encodeURIComponent(id)}/shipments/${encodeURIComponent(shipmentId)}/history`)).data.data },
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
  async update(campaignId, campaign) {
    const response = await apiClient.patch(`/campaigns/${campaignId}`, campaign)
    return response.data.data
  },
  async updateStatus(campaignId, status) {
    const response = await apiClient.patch(`/campaigns/${campaignId}/status`, { status })
    return response.data.data
  },
  async addCreators(campaignId, creatorIds) {
    const response = await apiClient.post(`/campaigns/${campaignId}/creators`, { creatorIds })
    return response.data.data
  },
  async importCreators(campaignId, rows) {
    const response = await apiClient.post(`/campaigns/${campaignId}/creators/import`, { rows }, { timeout: 300000 })
    return response.data.data
  },
  async updateCreator(campaignId, creatorId, changes) {
    const response = await apiClient.patch(`/campaigns/${campaignId}/creators/${creatorId}?compact=1`, changes)
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

export { publicReviewApi } from './publicReviewApi'
