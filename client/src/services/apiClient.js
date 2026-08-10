import axios from 'axios'

export function normalizeApiBaseUrl(value) {
  const baseUrl = String(value || '').trim().replace(/\/+$/, '')
  if (!baseUrl) return '/api'
  return /\/api$/i.test(baseUrl) ? baseUrl : `${baseUrl}/api`
}

export const apiClient = axios.create({
  baseURL: normalizeApiBaseUrl(import.meta.env.VITE_API_URL),
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

let csrfToken = ''

export function setCsrfToken(value) {
  csrfToken = String(value || '')
}

export function clearCsrfToken() {
  csrfToken = ''
}

apiClient.interceptors.request.use((config) => {
  const method = String(config.method || 'get').toLowerCase()
  if (csrfToken && !['get', 'head', 'options'].includes(method)) {
    config.headers['x-csrf-token'] = csrfToken
  }
  return config
})

export function getApiErrorMessage(error, fallback = 'Không thể kết nối tới server.') {
  const responseError = error?.response?.data?.error
  if (responseError?.details && typeof responseError.details === 'object') {
    const firstDetail = Object.values(responseError.details).find(Boolean)
    if (typeof firstDetail === 'string') return firstDetail
  }
  return responseError?.message || error?.message || fallback
}
