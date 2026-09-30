import Papa from 'papaparse'
import { normalizeSegment, normalizeType, normalizeTypeList, parseLocalizedNumber, readCreatorImportRows } from './creatorImport'
import { formatCategoryPaths, parseCategoryPaths } from './creatorCategoryPaths'
import { formatCreatorList } from './creatorLists'
import { normalizeTikTokId, normalizeTikTokLink } from './creatorValidation'
import { calculateBookingPricing } from './pricing'

export const INTERNAL_FILE_COLUMNS = [
  ['Link TikTok', 'tiktokLink'], ['ID TikTok', 'tiktokId'], ['Segment', 'segment'],
  ['Category', 'category'], ['Type', 'type'], ['Followers', 'followers'], ['GMV / Month', 'gmvMonth'],
  ['Cost', 'cost'], ['Extra/FOC', 'extraCost'], ['Cast', 'totalCast'], ['Expense', 'bookingExpense'],
  ['AGI', 'agi'], ['Scope', 'scope'], ['Contact', 'contact'], ['PIC', 'pic'], ['MCN Note', 'mcnNote'],
]
const aliases = {
  tiktoklink: 'tiktokLink', linktiktok: 'tiktokLink', tiktokid: 'tiktokId', idtiktok: 'tiktokId',
  segment: 'segment', category: 'category', type: 'type', followers: 'followers', follower: 'followers',
  gmvmonth: 'gmvMonth', gmv: 'gmvMonth', cost: 'cost', extracost: 'extraCost', extrafoc: 'extraCost', extra: 'extraCost',
  scope: 'scope', contact: 'contact', pic: 'pic', mcnnote: 'mcnNote', name: 'name', tencreator: 'name',
}
const numericFields = ['followers', 'gmvMonth', 'cost', 'extraCost']
const normalizeHeader = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]/g, '')

export function parseInternalListingRows(rows, creators = [], assignments = []) {
  const headerIndex = rows.findIndex((row) => row.some((cell) => aliases[normalizeHeader(cell)] === 'tiktokId'))
  if (headerIndex < 0) throw new Error('Không tìm thấy cột ID TikTok trong file.')
  const fields = rows[headerIndex].map((cell) => aliases[normalizeHeader(cell)] || (normalizeHeader(cell).startsWith('extrafoc') ? 'extraCost' : undefined))
  if (!fields.includes('tiktokLink')) throw new Error('File cần có cột Link TikTok. Hãy tải template của Internal Listings.')
  const assigned = new Set(assignments.map((item) => String(item.creatorId)))
  const idOwners = new Map()
  const linkOwners = new Map()
  for (const creator of creators) {
    const id = normalizeTikTokId(creator.tiktokId)
    const link = normalizeTikTokLink(creator.tiktokLink)
    idOwners.set(id, [...(idOwners.get(id) || []), creator])
    linkOwners.set(link, [...(linkOwners.get(link) || []), creator])
  }
  const seenIds = new Set()
  const seenLinks = new Set()
  const seenCreators = new Set()
  const preview = []
  rows.slice(headerIndex + 1).forEach((cells, index) => {
    if (!cells.some((cell) => String(cell ?? '').trim())) return
    const values = {}
    fields.forEach((field, column) => {
      if (field && String(cells[column] ?? '').trim()) values[field] = String(cells[column]).trim()
    })
    const errors = []
    if (!values.tiktokId) errors.push('Thiếu ID TikTok')
    if (!values.tiktokLink) errors.push('Thiếu Link TikTok')
    numericFields.forEach((field) => {
      if (values[field] === undefined) return
      values[field] = parseLocalizedNumber(values[field])
      if (!Number.isFinite(values[field]) || values[field] < 0 || (field === 'followers' ? !Number.isInteger(values[field]) || values[field] > 2_147_483_647 : values[field] >= 1e16)) {
        errors.push(`${INTERNAL_FILE_COLUMNS.find((column) => column[1] === field)[0]} không hợp lệ hoặc vượt giới hạn`)
      }
    })
    if (values.segment) {
      const segment = normalizeSegment(values.segment)
      if (!segment) errors.push('Segment không hợp lệ (TOP, MASSIVE, MINI, FREECAST)')
      else values.segment = segment
    }
    if (values.category) {
      values.category = parseCategoryPaths(values.category)
      if (values.category.some((path) => path.split(' > ').some((part) => part.length > 80))) errors.push('Mỗi tên Category/Subcategory tối đa 80 ký tự')
    }
    if (values.type) {
      if (values.type.split(/[,;|\n]+/).some((type) => !normalizeType(type))) errors.push('Type không hợp lệ (VIDEO, LIVESTREAM)')
      values.type = normalizeTypeList(values.type)
    }
    const id = normalizeTikTokId(values.tiktokId)
    const link = normalizeTikTokLink(values.tiktokLink)
    const matches = [...new Map([...(idOwners.get(id) || []), ...(linkOwners.get(link) || [])].map((creator) => [String(creator.id), creator])).values()]
    if (matches.length > 1) errors.push('ID và Link TikTok khớp nhiều hồ sơ khác nhau. Cần kiểm tra lại')
    const match = matches.length === 1 ? matches[0] : null
    if ((id && seenIds.has(id)) || (link && seenLinks.has(link)) || (match && seenCreators.has(String(match.id)))) errors.push('Creator trùng trong file; giữ dòng hợp lệ đầu tiên')
    if (!errors.length) {
      seenIds.add(id); seenLinks.add(link)
      if (match) seenCreators.add(String(match.id))
    }
    preview.push({ rowNumber: headerIndex + index + 2, values, errors, action: errors.length ? 'skip' : match ? assigned.has(String(match.id)) ? 'update' : 'add' : 'create' })
  })
  if (!preview.length) throw new Error('File chưa có dữ liệu Creator. Điền các dòng bên dưới header rồi import lại.')
  if (preview.length > 5000) throw new Error('Mỗi lần import tối đa 5.000 dòng.')
  return preview
}

export async function readInternalListingFile(file, creators, assignments) {
  if (!/\.(xlsx|csv)$/i.test(file.name)) throw new Error('Chỉ hỗ trợ file Excel (.xlsx) hoặc CSV.')
  if (file.size > 20 * 1024 * 1024) throw new Error('File tối đa 20 MB.')
  return parseInternalListingRows(await readCreatorImportRows(file), creators, assignments)
}

export function internalListingExportRows(campaign, creators) {
  const sources = new Map(creators.map((creator) => [String(creator.id), creator]))
  return (campaign.creators || []).map((assignment) => {
    const source = sources.get(String(assignment.creatorId)) || assignment
    const cost = assignment.quotedCost !== '' && assignment.quotedCost != null ? Number(assignment.quotedCost) : Number(source.cost || 0)
    const extraCost = assignment.quotedExtraCost !== '' && assignment.quotedExtraCost != null ? Number(assignment.quotedExtraCost) : Number(source.extraCost || 0)
    const values = { ...source, cost, extraCost, ...calculateBookingPricing(cost, extraCost), scope: assignment.scope || source.scope || '', pic: assignment.pic || '', category: formatCategoryPaths(source.category), type: formatCreatorList(source.type) }
    return INTERNAL_FILE_COLUMNS.map(([, field]) => values[field] ?? '')
  })
}

export function exportInternalListings(campaign, creators) {
  const csv = Papa.unparse([INTERNAL_FILE_COLUMNS.map(([header]) => header), ...internalListingExportRows(campaign, creators)], { escapeFormulae: true })
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${campaign.id}-internal-listings.csv`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
