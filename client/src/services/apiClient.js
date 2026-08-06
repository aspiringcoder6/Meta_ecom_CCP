import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

export function getApiErrorMessage(error, fallback = 'Không thể kết nối tới server.') {
  const responseError = error?.response?.data?.error
  if (responseError?.details && typeof responseError.details === 'object') {
    const firstDetail = Object.values(responseError.details).find(Boolean)
    if (typeof firstDetail === 'string') return firstDetail
  }
  return responseError?.message || error?.message || fallback
}
