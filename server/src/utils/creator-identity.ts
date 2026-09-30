export function normalizedTikTokId(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/^@+/, '')
}

export function normalizedTikTokLink(value: unknown) {
  const text = String(value ?? '').trim().toLowerCase()
  if (!text) return ''
  try {
    const url = new URL(text)
    return `${url.hostname.replace(/^www\./, '')}${url.pathname.replace(/\/+$/, '') || '/'}`
  } catch {
    return text.replace(/\/+$/, '')
  }
}
