export function toCreatorList(value, fallback = []) {
  const rawValues = Array.isArray(value)
    ? value
    : String(value ?? '').trim() === 'VIDEO / LIVESTREAM'
      ? ['VIDEO', 'LIVESTREAM']
      : String(value ?? '').split(/[,;|\n]+/)
  const values = [...new Set(rawValues.map((item) => String(item ?? '').trim()).filter(Boolean))]
  return values.length ? values : [...fallback]
}

export function formatCreatorList(value, separator = ', ') {
  return toCreatorList(value).join(separator)
}

export function formatCreatorHandle(value) {
  const id = String(value ?? '').trim()
  return id.startsWith('@') ? id : `@${id}`
}
