export function isRetryableReviewError(error) {
  if (error?.code === 'ERR_CANCELED') return false
  return !error?.response || [500, 502, 503, 504].includes(error.response.status)
}

export async function loadPublicReview(request, { signal, onRetry } = {}) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const campaign = await request({ signal })
      if (!campaign?.id || !Array.isArray(campaign.creators)) {
        throw Object.assign(new Error('Backend chưa trả dữ liệu Client Review.'), { code: 'REVIEW_SERVICE_STARTING' })
      }
      return campaign
    } catch (error) {
      if (signal?.aborted || attempt === 1 || !isRetryableReviewError(error)) throw error
      onRetry?.()
    }
  }
}

export function reviewLoadFailure(error) {
  if (error?.response?.data?.error?.code === 'REVIEW_LINK_INVALID' || error?.response?.status === 410) {
    return { invalid: true, title: 'Link review không hợp lệ', message: 'Link đã bị thu hồi hoặc Campaign không còn tồn tại. Vui lòng liên hệ team Meta Ecom.' }
  }
  return { invalid: false, title: 'Chưa tải được Client Review', message: 'Backend có thể đang khởi động hoặc mất kết nối. Bạn không cần đăng nhập; hãy thử tải lại. Bản nháp trên trình duyệt vẫn được giữ.' }
}
