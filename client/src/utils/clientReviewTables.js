import { clientReviewDecisionLabel, effectiveClientDecision } from '../config/campaigns'
import { formatCategoryPaths } from './creatorCategoryPaths'
import { toCreatorList } from './creatorLists'

const collator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' })
const KOC_NUMERIC_FIELDS = new Set(['expense', 'followers', 'gmvMonth'])
const DELIVERABLE_NUMERIC_FIELDS = new Set(['quantity'])
const DELIVERABLE_ITEM_FIELDS = new Set(['product', 'progress', 'sdha', 'demoLink', 'metaEcomNote', 'brandFeedback', 'airTime', 'airLink', 'codeAds', 'codeAdsExpiry'])

export const EMPTY_CLIENT_KOC_FILTERS = {
  search: '', segment: [], category: [], type: [], brandPick: [], kocConfirm: [],
}

export const EMPTY_CLIENT_DELIVERABLE_FILTERS = {
  search: '', progress: [], product: [], sdha: [], airStatus: [],
}

function text(value) {
  return String(value ?? '').trim().toLocaleLowerCase('vi')
}

function compare(left, right, key, direction, numericFields) {
  const leftEmpty = left === null || left === undefined || left === ''
  const rightEmpty = right === null || right === undefined || right === ''
  if (leftEmpty || rightEmpty) {
    if (leftEmpty && rightEmpty) return 0
    return leftEmpty ? 1 : -1
  }
  const result = numericFields.has(key)
    ? Number(left) - Number(right)
    : collator.compare(String(left), String(right))
  return direction === 'desc' ? -result : result
}

function kocDecision(creator) {
  return creator.kocDecision || (creator.creatorConfirmed ? 'APPROVED' : 'PENDING')
}

function kocValue(creator, responses, key) {
  const response = responses[String(creator.creatorId)] || {}
  const values = {
    tiktokLink: creator.tiktokLink || creator.channelLink,
    tiktokId: creator.tiktokId,
    expense: creator.expense ?? creator.suggestedPrice,
    segment: creator.segment,
    category: formatCategoryPaths(creator.category || []),
    type: toCreatorList(creator.type).join(', '),
    followers: creator.followers,
    gmvMonth: creator.gmvMonth,
    metaEcomNote: creator.metaEcomNote,
    brandPick: clientReviewDecisionLabel(response.decision || effectiveClientDecision(creator)),
    brandNote: response.note ?? creator.clientNote,
    kocConfirm: clientReviewDecisionLabel(kocDecision(creator)),
  }
  return values[key]
}

export function filterAndSortClientKocs(creators, responses, filters, sortCriteria) {
  const search = text(filters.search)
  const filtered = creators.filter((creator) => {
    const response = responses[String(creator.creatorId)] || {}
    const category = formatCategoryPaths(creator.category || [])
    const types = toCreatorList(creator.type)
    const brandPick = clientReviewDecisionLabel(response.decision || effectiveClientDecision(creator))
    const confirm = clientReviewDecisionLabel(kocDecision(creator))
    if (filters.segment.length && !filters.segment.includes(creator.segment)) return false
    if (filters.category.length && !filters.category.some((value) => category.includes(value))) return false
    if (filters.type.length && !types.some((value) => filters.type.includes(value))) return false
    if (filters.brandPick.length && !filters.brandPick.includes(brandPick)) return false
    if (filters.kocConfirm.length && !filters.kocConfirm.includes(confirm)) return false
    if (!search) return true
    return text([
      creator.name, creator.tiktokId, creator.tiktokLink, creator.segment, category,
      types.join(' '), creator.metaEcomNote, response.note, brandPick, confirm,
    ].join(' ')).includes(search)
  })

  if (!sortCriteria.length) return filtered
  return filtered
    .map((creator, originalIndex) => ({ creator, originalIndex }))
    .sort((left, right) => {
      for (const criterion of sortCriteria) {
        const result = compare(
          kocValue(left.creator, responses, criterion.key),
          kocValue(right.creator, responses, criterion.key),
          criterion.key,
          criterion.direction,
          KOC_NUMERIC_FIELDS,
        )
        if (result !== 0) return result
      }
      return left.originalIndex - right.originalIndex
    })
    .map(({ creator }) => creator)
}

function deliverableValue(item, key) {
  if (key === 'sdha') return item?.sdha ? 'Có SDHA' : 'Không SDHA'
  return item?.[key]
}

function sortDeliverableItems(items, criteria) {
  const itemCriteria = criteria.filter(({ key }) => DELIVERABLE_ITEM_FIELDS.has(key))
  if (!itemCriteria.length) return items
  return items
    .map((item, originalIndex) => ({ item, originalIndex }))
    .sort((left, right) => {
      for (const criterion of itemCriteria) {
        const result = compare(deliverableValue(left.item, criterion.key), deliverableValue(right.item, criterion.key), criterion.key, criterion.direction, DELIVERABLE_NUMERIC_FIELDS)
        if (result !== 0) return result
      }
      return left.originalIndex - right.originalIndex
    })
    .map(({ item }) => item)
}

function groupSortValue(group, key) {
  if (key === 'quantity') return group.quantity
  return deliverableValue(group.items[0], key)
}

export function filterAndSortClientDeliverables(groups, filters, sortCriteria) {
  const search = text(filters.search)
  const filtered = groups.flatMap((group) => {
    const creatorMatches = search && text([group.creator.name, group.creator.tiktokId].join(' ')).includes(search)
    const hasItemFilters = filters.progress.length || filters.product.length || filters.sdha.length || filters.airStatus.length
    if (!group.items.length) return !hasItemFilters && (!search || creatorMatches) ? [group] : []
    const items = group.items.filter((item) => {
      const product = item.product || 'Chưa có Product'
      const progress = item.progress || 'Đang liên hệ'
      const sdha = item.sdha ? 'Có SDHA' : 'Không SDHA'
      const airStatus = item.airLink ? 'Đã có Link Air' : 'Chưa có Link Air'
      if (filters.progress.length && !filters.progress.includes(progress)) return false
      if (filters.product.length && !filters.product.includes(product)) return false
      if (filters.sdha.length && !filters.sdha.includes(sdha)) return false
      if (filters.airStatus.length && !filters.airStatus.includes(airStatus)) return false
      if (!search || creatorMatches) return true
      return text([product, progress, item.demoLink, item.metaEcomNote, item.brandFeedback, item.airTime, item.airLink, item.codeAds, item.codeAdsExpiry].join(' ')).includes(search)
    })
    return items.length ? [{ ...group, items: sortDeliverableItems(items, sortCriteria) }] : []
  })

  if (!sortCriteria.length) return filtered
  return filtered
    .map((group, originalIndex) => ({ group, originalIndex }))
    .sort((left, right) => {
      for (const criterion of sortCriteria) {
        const result = compare(groupSortValue(left.group, criterion.key), groupSortValue(right.group, criterion.key), criterion.key, criterion.direction, DELIVERABLE_NUMERIC_FIELDS)
        if (result !== 0) return result
      }
      return left.originalIndex - right.originalIndex
    })
    .map(({ group }) => group)
}
