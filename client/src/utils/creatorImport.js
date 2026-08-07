import Papa from 'papaparse'
import readXlsxFile from 'read-excel-file/browser'
import { CREATOR_CATEGORIES, CREATOR_SEGMENTS, CREATOR_TYPES } from '../config/labels'

const HEADER_FIELDS = [
  { field: 'tiktokLink', matches: ['link tiktok', 'tiktok link'] },
  { field: 'tiktokId', matches: ['id tiktok', 'tiktok id'] },
  { field: 'segment', matches: ['segment'] },
  { field: 'category', matches: ['category'] },
  { field: 'type', matches: ['type'] },
  { field: 'cost', matches: ['cost'] },
  { field: 'extraCost', matches: ['extra foc'] },
  { field: 'followers', matches: ['followers', 'follower'] },
  { field: 'gmvMonth', matches: ['gmv month', 'gmv'] },
  { field: 'scope', matches: ['scope'] },
  { field: 'contact', matches: ['contact'] },
  { field: 'historicalCampaign', matches: ['tinh trang hop tac', 'historical campaign'] },
  { field: 'mcnNote', matches: ['mcn note', 'meta ecom note'] },
]

function normalizeText(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function normalizeTikTokId(value) {
  return String(value ?? '').trim().replace(/^@/, '').toLowerCase()
}

function getHeaderField(header) {
  const normalized = normalizeText(header)
  return HEADER_FIELDS.find((item) => item.matches.some((match) => normalized === match || normalized.startsWith(`${match} `)))?.field
}

function parseLocalizedNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN
  let text = String(value ?? '').trim().toLowerCase()
  if (!text) return 0

  let multiplier = 1
  if (/ty|ti|billion|\bb\b/.test(normalizeText(text))) multiplier = 1_000_000_000
  else if (/(million|trieu)|tr\b|m\b/i.test(normalizeText(text))) multiplier = 1_000_000
  else if (/(thousand|nghin)|k\b/i.test(normalizeText(text))) multiplier = 1_000

  text = text.replace(/₫|vnd|đ/gi, '').replace(/tỷ|tỉ|ty|ti|billion|million|triệu|trieu|tr|thousand|nghìn|nghin/gi, '').replace(/[kmb]/gi, '').replace(/\s+/g, '')
  if (!text) return 0

  if (multiplier > 1) {
    if (text.includes(',') && text.includes('.')) {
      const decimalSeparator = text.lastIndexOf(',') > text.lastIndexOf('.') ? ',' : '.'
      const groupingSeparator = decimalSeparator === ',' ? /\./g : /,/g
      text = text.replace(groupingSeparator, '').replace(decimalSeparator, '.')
    } else if (text.includes(',')) text = text.replace(',', '.')
  } else {
    const commaGroups = /^-?\d{1,3}(,\d{3})+$/.test(text)
    const dotGroups = /^-?\d{1,3}(\.\d{3})+$/.test(text)
    if (commaGroups) text = text.replace(/,/g, '')
    else if (dotGroups) text = text.replace(/\./g, '')
    else if (text.includes(',') && !text.includes('.')) text = text.replace(',', '.')
    else if (text.includes(',') && text.includes('.')) text = text.replace(/,/g, '')
  }

  const number = Number(text)
  return Number.isFinite(number) ? Math.round(number * multiplier) : NaN
}

function normalizeFromOptions(value, options, aliases = {}) {
  const normalized = normalizeText(value)
  if (!normalized) return null
  if (aliases[normalized]) return aliases[normalized]
  return options.find((option) => normalizeText(option) === normalized) || null
}

function normalizeSegment(value) {
  const normalized = normalizeText(value)
  if (normalized.includes('massive')) return 'MASSIVE'
  if (normalized.includes('top')) return 'TOP'
  if (normalized.includes('free')) return 'FREECAST'
  if (normalized.includes('mini') || normalized.includes('mass')) return 'MINI'
  return normalizeFromOptions(value, CREATOR_SEGMENTS)
}

function normalizeCategory(value) {
  return normalizeFromOptions(value, CREATOR_CATEGORIES, {
    beauty: 'BEAUTY', skincare: 'SKINCARE', lifestyle: 'LIFESTYLE', fashion: 'FASHION', food: 'FOOD', tech: 'TECH',
    'mom baby': 'MOM&BABY', 'mom and baby': 'MOM&BABY',
  })
}

function normalizeType(value) {
  const normalized = normalizeText(value)
  if (normalized.includes('video') && (normalized.includes('live') || normalized.includes('livestream'))) return 'VIDEO / LIVESTREAM'
  if (normalized.includes('live')) return 'LIVESTREAM'
  if (normalized.includes('video')) return 'VIDEO'
  return normalizeFromOptions(value, CREATOR_TYPES)
}

function extractTikTokId(link) {
  return String(link || '').match(/tiktok\.com\/@([^/?#]+)/i)?.[1] || ''
}

function createImportedCreator(values, index) {
  const tiktokId = String(values.tiktokId || extractTikTokId(values.tiktokLink)).trim().replace(/^@/, '')
  const tiktokLink = String(values.tiktokLink || (tiktokId ? `https://www.tiktok.com/@${tiktokId}` : '')).trim()
  const errors = []
  if (!tiktokId) errors.push('Thiếu ID TikTok')
  if (!/^https?:\/\/(www\.)?tiktok\.com\/@[^\s/]+/i.test(tiktokLink)) errors.push('Link TikTok không hợp lệ')

  const segment = normalizeSegment(values.segment) || 'MINI'
  const category = normalizeCategory(values.category) || 'BEAUTY'
  const type = normalizeType(values.type) || 'VIDEO'
  const cost = parseLocalizedNumber(values.cost)
  const extraCost = parseLocalizedNumber(values.extraCost)
  const followers = parseLocalizedNumber(values.followers)
  const gmvMonth = parseLocalizedNumber(values.gmvMonth)
  if ([cost, extraCost, followers, gmvMonth].some((number) => !Number.isFinite(number) || number < 0)) errors.push('Có giá trị số không hợp lệ')

  const historicalText = normalizeText(values.historicalCampaign)
  const historicalCampaign = historicalText.includes('da hop tac') || historicalText === 'yes' ? 'Đã hợp tác' : 'Chưa hợp tác'
  const id = Date.now() + index
  return {
    errors,
    creator: {
      id, name: tiktokId || `Creator dòng ${index + 2}`, handle: `@${tiktokId}`, initials: (tiktokId || 'CR').slice(0, 2).toUpperCase(), platform: 'TikTok',
      tiktokLink, tiktokId, segment, category, type, cost: Number.isFinite(cost) ? cost : 0, extraCost: Number.isFinite(extraCost) ? extraCost : 0,
      followers: Number.isFinite(followers) ? followers : 0, gmvMonth: Number.isFinite(gmvMonth) ? gmvMonth : 0,
      scope: String(values.scope || ''), contact: String(values.contact || ''), historicalCampaign, mcnNote: String(values.mcnNote || ''),
      engagement: 0, status: 'Available', email: 'Chưa cung cấp', phone: 'Chưa cung cấp', bookingPrice: Number.isFinite(cost) ? cost : 0,
      campaigns: 0, color: '#dcecff', accent: '#1769aa',
    },
  }
}

export function parseCreatorRows(rows, existingCreators = [], mode = 'append') {
  const headerIndex = rows.findIndex((row) => row.some((cell) => normalizeText(cell) === 'id tiktok'))
  if (headerIndex < 0) throw new Error('Không tìm thấy cột “ID Tiktok” trong file.')
  const headers = rows[headerIndex].map(getHeaderField)
  const existingIds = new Set(existingCreators.map((creator) => normalizeTikTokId(creator.tiktokId)))
  const importedIds = new Set()
  const creators = []
  const errors = []
  let duplicateCount = 0

  rows.slice(headerIndex + 1).forEach((row, rowIndex) => {
    if (!row.some((cell) => String(cell ?? '').trim())) return
    const values = {}
    headers.forEach((field, columnIndex) => {
      if (!field) return
      const cellValue = row[columnIndex]
      if ((values[field] === undefined || values[field] === '') && cellValue !== null && cellValue !== undefined && cellValue !== '') values[field] = cellValue
    })
    if (normalizeText(values.tiktokId) === 'text' && normalizeText(values.tiktokLink) === 'link') return
    const parsed = createImportedCreator(values, rowIndex)
    const normalizedId = normalizeTikTokId(parsed.creator.tiktokId)
    if (normalizedId && (importedIds.has(normalizedId) || (mode === 'append' && existingIds.has(normalizedId)))) {
      duplicateCount += 1
      return
    }
    if (parsed.errors.length) {
      errors.push({
        row: headerIndex + rowIndex + 2,
        identifier: String(values.tiktokId || values.tiktokLink || '').trim() || 'Không có TikTok ID / Link',
        messages: parsed.errors,
      })
      return
    }
    importedIds.add(normalizedId)
    creators.push(parsed.creator)
  })

  return { creators, duplicateCount, errors, sourceRows: rows.length - headerIndex - 1 }
}

function parseCsvFile(file) {
  return new Promise((resolve, reject) => Papa.parse(file, { skipEmptyLines: false, complete: (result) => resolve(result.data), error: reject }))
}

export async function parseCreatorImportFile(file, existingCreators, mode) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  let rows
  if (extension === 'csv') rows = await parseCsvFile(file)
  else {
    const workbookResult = await readXlsxFile(file)
    rows = Array.isArray(workbookResult[0]) ? workbookResult : workbookResult[0]?.data
  }
  if (!Array.isArray(rows)) throw new Error('Không thể đọc sheet dữ liệu đầu tiên trong file Excel.')
  return parseCreatorRows(rows, existingCreators, mode)
}
