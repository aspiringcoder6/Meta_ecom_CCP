import { calculateBookingPricing } from './pricing'
import { formatCreatorList } from './creatorLists'

const NUMBER_FIELDS = new Set(['cost', 'extraCost', 'totalCast', 'bookingExpense', 'agi', 'followers', 'gmvMonth'])
const collator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' })

function getSortValue(creator, key) {
  if (key === 'totalCast' || key === 'bookingExpense' || key === 'agi') {
    return calculateBookingPricing(creator.cost, creator.extraCost)[key]
  }
  if (key === 'category' || key === 'type') return formatCreatorList(creator[key])
  return creator[key]
}

function compareValues(left, right, key, direction) {
  const leftEmpty = left === null || left === undefined || left === ''
  const rightEmpty = right === null || right === undefined || right === ''
  if (leftEmpty || rightEmpty) {
    if (leftEmpty && rightEmpty) return 0
    return leftEmpty ? 1 : -1
  }

  const comparison = NUMBER_FIELDS.has(key)
    ? Number(left) - Number(right)
    : collator.compare(String(left), String(right))

  return direction === 'desc' ? -comparison : comparison
}

export function sortCreators(creators, criteria) {
  if (!criteria.length) return creators

  return creators
    .map((creator, originalIndex) => ({ creator, originalIndex }))
    .sort((left, right) => {
      for (const criterion of criteria) {
        const comparison = compareValues(
          getSortValue(left.creator, criterion.key),
          getSortValue(right.creator, criterion.key),
          criterion.key,
          criterion.direction,
        )
        if (comparison !== 0) return comparison
      }
      return left.originalIndex - right.originalIndex
    })
    .map(({ creator }) => creator)
}

export function cycleCreatorSort(criteria, key) {
  const currentIndex = criteria.findIndex((criterion) => criterion.key === key)
  if (currentIndex === -1) return [...criteria, { key, direction: 'asc' }]

  const current = criteria[currentIndex]
  if (current.direction === 'asc') {
    return criteria.map((criterion, index) => index === currentIndex
      ? { ...criterion, direction: 'desc' }
      : criterion)
  }

  return criteria.filter((_, index) => index !== currentIndex)
}
