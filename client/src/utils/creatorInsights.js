import { calculateBookingPricing } from './pricing'

const SEGMENT_ORDER = ['MASSIVE', 'TOP', 'MINI', 'FREECAST']

function groupCreators(creators, field, fallbackLabel) {
  return Object.values(creators.reduce((groups, creator) => {
    const label = String(creator[field] || '').trim() || fallbackLabel
    const current = groups[label] || { label, count: 0, bookingExpense: 0 }
    current.count += 1
    current.bookingExpense += calculateBookingPricing(creator.cost, creator.extraCost).bookingExpense
    groups[label] = current
    return groups
  }, {}))
}

export function getCreatorInsights(creators) {
  const availableCreators = creators.filter((creator) => creator.status !== 'Archived')
  const totalBookingExpense = availableCreators.reduce(
    (total, creator) => total + calculateBookingPricing(creator.cost, creator.extraCost).bookingExpense,
    0,
  )

  const categories = groupCreators(availableCreators, 'category', 'Chưa phân loại')
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, 'vi'))
    .map((category) => ({
      ...category,
      percent: availableCreators.length ? Math.round((category.count / availableCreators.length) * 100) : 0,
    }))

  const segmentRank = (label) => {
    const index = SEGMENT_ORDER.indexOf(label)
    return index === -1 ? SEGMENT_ORDER.length : index
  }
  const segments = groupCreators(availableCreators, 'segment', 'Chưa phân khúc')
    .sort((left, right) => segmentRank(left.label) - segmentRank(right.label) || left.label.localeCompare(right.label, 'vi'))
    .map((segment) => ({
      ...segment,
      creatorPercent: availableCreators.length ? Math.round((segment.count / availableCreators.length) * 100) : 0,
      expensePercent: totalBookingExpense ? Math.round((segment.bookingExpense / totalBookingExpense) * 100) : 0,
    }))

  return {
    totalCreators: creators.length,
    availableCreators,
    availableCount: availableCreators.length,
    archivedCount: creators.length - availableCreators.length,
    totalBookingExpense,
    averageBookingExpense: availableCreators.length ? totalBookingExpense / availableCreators.length : 0,
    categories,
    segments,
    topCategory: categories[0],
  }
}
