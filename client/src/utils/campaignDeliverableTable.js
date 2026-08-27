import { toCreatorList } from './creatorLists'

const collator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' })

export const DELIVERABLE_NUMERIC_FILTER_FIELDS = [
  { value: 'expense', label: 'Expense', format: 'currency' },
  { value: 'gmvMonth', label: 'GMV / Month', format: 'currency' },
  { value: 'followers', label: 'Followers', format: 'number' },
  { value: 'quantity', label: 'Quantity', format: 'number' },
  { value: 'performance', label: 'Performance (GMV)', format: 'currency' },
]

export const DELIVERABLE_NUMERIC_FILTER_OPERATORS = [
  { value: 'between', label: 'Trong khoảng' },
  { value: 'min', label: 'Tối thiểu' },
  { value: 'max', label: 'Tối đa' },
  { value: 'equal', label: 'Bằng' },
]

export const EMPTY_DELIVERABLE_FILTERS = {
  search: '',
  segment: [],
  type: [],
  progress: [],
  product: [],
  sdha: [],
}

const GROUP_NUMBER_FIELDS = new Set(['expense', 'gmvMonth', 'followers', 'quantity'])
const ITEM_NUMBER_FIELDS = new Set(['performance'])
const ITEM_SORT_FIELDS = new Set([
  'progress', 'sdha', 'product', 'demoLink', 'metaEcomNote', 'brandFeedback',
  'performance', 'airTime', 'airLink', 'codeAds', 'codeAdsExpiry',
])

function cleanText(value) {
  return String(value ?? '').trim().toLocaleLowerCase('vi')
}

function groupValue(group, key) {
  const { source, assignment } = group
  const values = {
    tiktokLink: source.tiktokLink,
    tiktokId: source.tiktokId,
    expense: group.expense,
    segment: source.segment,
    concept: source.concept,
    type: toCreatorList(source.type).join(', '),
    gmvMonth: source.gmvMonth,
    followers: source.followers,
    quantity: group.quantity,
  }
  return values[key] ?? assignment?.[key]
}

function itemValue(item, key) {
  if (key === 'sdha') return item.sdha ? 'Có SDHA' : 'Không SDHA'
  return item[key]
}

function compareValues(left, right, key, direction) {
  const leftEmpty = left === null || left === undefined || left === ''
  const rightEmpty = right === null || right === undefined || right === ''
  if (leftEmpty || rightEmpty) {
    if (leftEmpty && rightEmpty) return 0
    return leftEmpty ? 1 : -1
  }

  const numeric = GROUP_NUMBER_FIELDS.has(key) || ITEM_NUMBER_FIELDS.has(key)
  const comparison = numeric
    ? Number(left) - Number(right)
    : collator.compare(String(left), String(right))
  return direction === 'desc' ? -comparison : comparison
}

function matchesNumeric(value, filter) {
  const number = Number(value) || 0
  const first = Number(filter.value)
  const second = Number(filter.maxValue)
  if (filter.operator === 'between') return number >= first && number <= second
  if (filter.operator === 'min') return number >= first
  if (filter.operator === 'max') return number <= first
  return number === first
}

function matchesAny(sourceValues, selectedValues) {
  if (!selectedValues.length) return true
  return sourceValues.some((value) => selectedValues.includes(value))
}

function creatorSearchText(group) {
  const { source } = group
  return cleanText([
    source.name, source.tiktokId, source.tiktokLink, source.segment, source.concept,
    ...toCreatorList(source.type),
  ].join(' '))
}

function deliverableSearchText(item) {
  return cleanText([
    item.progress, item.product, item.demoLink, item.metaEcomNote, item.brandFeedback,
    item.airTime, item.airLink, item.codeAds, item.codeAdsExpiry, item.performance,
  ].join(' '))
}

function sortItems(items, criteria) {
  const itemCriteria = criteria.filter(({ key }) => ITEM_SORT_FIELDS.has(key))
  if (!itemCriteria.length) return items
  return items
    .map((item, originalIndex) => ({ item, originalIndex }))
    .sort((left, right) => {
      for (const criterion of itemCriteria) {
        const comparison = compareValues(
          itemValue(left.item, criterion.key),
          itemValue(right.item, criterion.key),
          criterion.key,
          criterion.direction,
        )
        if (comparison !== 0) return comparison
      }
      return left.originalIndex - right.originalIndex
    })
    .map(({ item }) => item)
}

function getGroupSortValue(group, key) {
  if (ITEM_SORT_FIELDS.has(key)) return itemValue(group.items[0], key)
  return groupValue(group, key)
}

export function filterAndSortDeliverableGroups(groups, filters, numericFilters, sortCriteria) {
  const search = cleanText(filters.search)
  const groupNumericFilters = numericFilters.filter(({ field }) => GROUP_NUMBER_FIELDS.has(field))
  const itemNumericFilters = numericFilters.filter(({ field }) => ITEM_NUMBER_FIELDS.has(field))

  const filtered = groups.flatMap((group) => {
    const sourceTypes = toCreatorList(group.source.type)
    if (!matchesAny([group.source.segment].filter(Boolean), filters.segment)) return []
    if (!matchesAny(sourceTypes, filters.type)) return []
    if (!groupNumericFilters.every((filter) => matchesNumeric(groupValue(group, filter.field), filter))) return []

    const creatorMatchesSearch = !search || creatorSearchText(group).includes(search)
    const items = group.items.filter((item) => {
      if (filters.progress.length && !filters.progress.includes(item.progress)) return false
      if (filters.product.length && !filters.product.includes(item.product || 'Chưa có Product')) return false
      const sdhaValue = item.sdha ? 'Có SDHA' : 'Không SDHA'
      if (filters.sdha.length && !filters.sdha.includes(sdhaValue)) return false
      if (!itemNumericFilters.every((filter) => matchesNumeric(itemValue(item, filter.field), filter))) return false
      return creatorMatchesSearch || deliverableSearchText(item).includes(search)
    })

    if (!items.length) return []
    return [{ ...group, items: sortItems(items, sortCriteria) }]
  })

  if (!sortCriteria.length) return filtered
  return filtered
    .map((group, originalIndex) => ({ group, originalIndex }))
    .sort((left, right) => {
      for (const criterion of sortCriteria) {
        const comparison = compareValues(
          getGroupSortValue(left.group, criterion.key),
          getGroupSortValue(right.group, criterion.key),
          criterion.key,
          criterion.direction,
        )
        if (comparison !== 0) return comparison
      }
      return left.originalIndex - right.originalIndex
    })
    .map(({ group }) => group)
}

export function cycleDeliverableSort(criteria, key) {
  const currentIndex = criteria.findIndex((criterion) => criterion.key === key)
  if (currentIndex === -1) return [...criteria, { key, direction: 'asc' }]
  if (criteria[currentIndex].direction === 'asc') {
    return criteria.map((criterion, index) => index === currentIndex
      ? { ...criterion, direction: 'desc' }
      : criterion)
  }
  return criteria.filter((_, index) => index !== currentIndex)
}
