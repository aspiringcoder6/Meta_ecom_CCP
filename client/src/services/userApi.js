import { apiClient } from './apiClient'

export const userApi = {
  async list(status) {
    const response = await apiClient.get('/users', { params: status ? { status } : {} })
    return response.data.data
  },
  async metrics() {
    const response = await apiClient.get('/users/metrics')
    return response.data.data
  },
  async create(payload) {
    const response = await apiClient.post('/users', payload)
    return response.data.data
  },
  async update(userId, payload) {
    const response = await apiClient.patch(`/users/${userId}`, payload)
    return response.data.data
  },
  async remove(userId) {
    await apiClient.delete(`/users/${userId}`)
  },
}
