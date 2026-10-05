export function normalizeProducts(value) {
  const seen = new Set()
  return (Array.isArray(value) ? value : [value]).flatMap((part) => typeof part === 'string' ? part.split(/[,\n]/) : []).flatMap((part) => {
    const name = part.replace(/\s+/g, ' ').trim()
    const key = name.toLocaleLowerCase('vi')
    if (!name || seen.has(key)) return []
    seen.add(key)
    return [name]
  })
}

export function sameProducts(left, right) {
  const keys = (value) => normalizeProducts(value).map((name) => name.toLocaleLowerCase('vi')).sort()
  return JSON.stringify(keys(left)) === JSON.stringify(keys(right))
}

export function campaignProductOptions(campaign, responses = {}) {
  return normalizeProducts((campaign?.creators || []).flatMap((creator) => [
    ...normalizeProducts(creator.brandProducts),
    ...normalizeProducts(responses[String(creator.creatorId)]?.brandProducts),
    ...(creator.deliverables || []).map((item) => item.product || ''),
  ])).sort((a, b) => a.localeCompare(b, 'vi'))
}

export function productToken(value, caret, multiple = true) {
  const text = String(value || '')
  const position = Math.max(0, Math.min(caret ?? text.length, text.length))
  if (!multiple) return { start: 0, end: text.length, query: text.trim() }
  const start = Math.max(text.lastIndexOf(',', position - 1), text.lastIndexOf('\n', position - 1)) + 1
  const next = text.slice(position).search(/[,\n]/)
  const end = next < 0 ? text.length : position + next
  return { start, end, query: text.slice(start, end).trim() }
}

export function fillProductToken(value, caret, product, multiple = true) {
  const text = String(value || '')
  const { start, end } = productToken(text, caret, multiple)
  const replacement = `${start ? ' ' : ''}${product}`
  return { value: text.slice(0, start) + replacement + text.slice(end), caret: start + replacement.length }
}

export function productSuggestions(options, value, caret, multiple = true) {
  const token = productToken(value, caret, multiple)
  const fold = (text) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/g, 'd').toLocaleLowerCase('vi')
  const query = fold(token.query)
  const selected = new Set(normalizeProducts(String(value).slice(0, token.start) + ',' + String(value).slice(token.end)).map(fold))
  return normalizeProducts(options).filter((name) => !selected.has(fold(name)) && fold(name) !== query && fold(name).includes(query))
    .sort((a, b) => Number(fold(b).startsWith(query)) - Number(fold(a).startsWith(query)) || a.localeCompare(b, 'vi')).slice(0, 8)
}

// Keep the optimistic/demo path consistent with the server's product-to-video rules.
export function withProductVideos(value, products, creatorId) {
  const items = (Array.isArray(value) ? value : []).map((item) => ({ ...item }))
  const isVideo = (item) => !item.type || ['video', 'video tiktok'].includes(String(item.type).toLowerCase())
  for (const product of normalizeProducts(products)) {
    const key = product.toLocaleLowerCase('vi')
    if (items.some((item) => isVideo(item) && String(item.product || '').trim().toLocaleLowerCase('vi') === key)) continue
    const index = items.findIndex((item) => isVideo(item) && !item.product
      && (!item.progress || item.progress === 'Đang liên hệ') && (!item.status || item.status === 'NOT_STARTED')
      && !['sdha', 'demoLink', 'metaEcomNote', 'brandFeedback', 'airTime', 'airLink', 'codeAds', 'codeAdsExpiry', 'performance'].some((field) => Boolean(item[field])))
    const video = { id: `product-video-${creatorId}-${encodeURIComponent(key)}`, type: 'Video TikTok', status: 'NOT_STARTED', progress: 'Đang liên hệ', product }
    if (index >= 0) items[index] = { ...items[index], ...video, id: items[index].id || video.id }
    else items.push(video)
  }
  return items
}
