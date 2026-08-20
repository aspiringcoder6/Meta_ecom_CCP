import { apiClient } from './apiClient'

export const notificationApi = {
  async list() {
    const response = await apiClient.get('/notifications')
    return response.data.data
  },
  async markRead(notificationId) {
    const response = await apiClient.patch(`/notifications/${notificationId}/read`)
    return response.data.data
  },
  async markAllRead() {
    const response = await apiClient.patch('/notifications/read-all')
    return response.data.data
  },
}
