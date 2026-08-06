import { apiClient } from './apiClient'

export const creatorApi = {
  async list() {
    const response = await apiClient.get('/creators')
    return response.data.data
  },
  async create(creator) {
    const response = await apiClient.post('/creators', creator)
    return response.data.data
  },
  async update(creatorId, changes) {
    const response = await apiClient.patch(`/creators/${creatorId}`, changes)
    return response.data.data
  },
  async remove(creatorId) {
    await apiClient.delete(`/creators/${creatorId}`)
  },
  async batch(changes) {
    const response = await apiClient.post('/creators/batch', changes)
    return response.data.data
  },
  async import(creators, mode) {
    const response = await apiClient.post('/creators/import', { creators, mode })
    return response.data.data
  },
  async metrics() {
    const response = await apiClient.get('/creators/metrics')
    return response.data.data
  },
}
