import { apiClient } from './apiClient'

export const authApi = {
  async signup(payload) {
    const response = await apiClient.post('/auth/signup', payload)
    return response.data.data
  },
  async login(payload) {
    const response = await apiClient.post('/auth/login', payload)
    return response.data.data
  },
  async google(payload) {
    const response = await apiClient.post('/auth/google', payload)
    return response.data.data
  },
  async me() {
    const response = await apiClient.get('/auth/me')
    return response.data.data
  },
  async logout() {
    await apiClient.post('/auth/logout')
  },
}
