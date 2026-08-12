import { calculateBookingPricing } from './pricing'
import { categoryPathMatches } from './creatorCategoryPaths'
import { toCreatorList } from './creatorLists'

export const DEFAULT_CREATOR_FILTERS = { search: '', segment: [], category: [], type: [] }

export const NUMERIC_FILTER_FIELDS = [
  { value: 'cost', label: 'Cost', format: 'currency' },
  { value: 'extraCost', label: 'Extra/FOC', format: 'currency' },
  { value: 'totalCast', label: 'Tổng Cast', format: 'currency' },
  { value: 'bookingExpense', label: 'Booking Expense', format: 'currency' },
  { value: 'followers', label: 'Followers', format: 'number' },
  { value: 'gmvMonth', label: 'GMV / Month', format: 'currency' },
  { value: 'engagement', label: 'Engagement', format: 'percent' },
  { value: 'campaigns', label: 'Số campaign', format: 'number' },
]

export const NUMERIC_FILTER_OPERATORS = [
  { value: 'between', label: 'Trong khoảng' },
  { value: 'min', label: 'Tối thiểu' },
  { value: 'max', label: 'Tối đa' },
  { value: 'equal', label: 'Bằng' },
]

export function getCreatorNumericValue(creator, field) {
  if (field === 'totalCast' || field === 'bookingExpense') {
    return calculateBookingPricing(creator.cost, creator.extraCost)[field]
  }
  return Number(creator[field]) || 0
}

function matchesNumericFilter(creator, filter) {
  const creatorValue = getCreatorNumericValue(creator, filter.field)
  const firstValue = Number(filter.value)
  const secondValue = Number(filter.maxValue)
  if (filter.operator === 'between') return creatorValue >= firstValue && creatorValue <= secondValue
  if (filter.operator === 'min') return creatorValue >= firstValue
  if (filter.operator === 'max') return creatorValue <= firstValue
  return creatorValue === firstValue
}

export function matchesCreatorFilters(creator, filters, numericFilters = []) {
  const query = filters.search.toLowerCase().trim()
  const categories = toCreatorList(creator.category)
  const types = toCreatorList(creator.type)
  const searchableValues = [creator.name, creator.tiktokId, ...categories, ...types, creator.scope, creator.contact]
  const matchesSearch = !query || searchableValues.some((value) => String(value || '').toLowerCase().includes(query))
  return matchesSearch
    && (filters.segment.length === 0 || filters.segment.includes(creator.segment))
    && (filters.category.length === 0 || filters.category.some((selectedCategory) => categories.some((category) => categoryPathMatches(category, selectedCategory))))
    && (filters.type.length === 0 || filters.type.some((type) => types.includes(type)))
    && numericFilters.every((filter) => matchesNumericFilter(creator, filter))
}
