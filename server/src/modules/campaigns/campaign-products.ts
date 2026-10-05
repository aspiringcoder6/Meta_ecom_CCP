import { randomUUID } from 'node:crypto'

export function normalizeProducts(value: unknown): string[] {
  const seen = new Set<string>()
  const parts = Array.isArray(value) ? value : [value]
  return parts.flatMap((part) => typeof part === 'string' ? part.split(/[,\n]/) : []).flatMap((part) => {
    const name = part.replace(/\s+/g, ' ').trim()
    const key = name.toLocaleLowerCase('vi')
    if (!name || seen.has(key)) return []
    seen.add(key)
    return [name]
  })
}

export function sameProducts(left: unknown, right: unknown) {
  const keys = (value: unknown) => normalizeProducts(value).map((name) => name.toLocaleLowerCase('vi')).sort()
  return JSON.stringify(keys(left)) === JSON.stringify(keys(right))
}

type Deliverable = Record<string, unknown>

function isVideo(item: Deliverable) {
  return !item.type || ['video', 'video tiktok'].includes(String(item.type).toLowerCase())
}

function unusedVideo(item: Deliverable) {
  return isVideo(item) && !item.product
    && (!item.progress || item.progress === 'Đang liên hệ')
    && (!item.status || item.status === 'NOT_STARTED')
    && !['sdha', 'demoLink', 'metaEcomNote', 'brandFeedback', 'airTime', 'airLink', 'codeAds', 'codeAdsExpiry', 'performance'].some((field) => Boolean(item[field]))
}

// Reuse untouched template slots; never delete work when a Brand removes a product.
export function withProductVideos(value: unknown, products: unknown): Deliverable[] {
  const items: Deliverable[] = (Array.isArray(value) ? value : []).filter((item) => item && typeof item === 'object' && !Array.isArray(item)).map((item) => ({ ...item }))
  for (const product of normalizeProducts(products)) {
    const key = product.toLocaleLowerCase('vi')
    if (items.some((item) => isVideo(item) && String(item.product || '').trim().toLocaleLowerCase('vi') === key)) continue
    const index = items.findIndex(unusedVideo)
    const video = { id: randomUUID(), type: 'Video TikTok', status: 'NOT_STARTED', progress: 'Đang liên hệ', product }
    if (index >= 0) items[index] = { ...items[index], ...video, id: items[index]?.id || video.id }
    else items.push(video)
  }
  return items
}
