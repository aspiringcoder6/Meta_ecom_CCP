import { calculateBookingPricing } from './pricing'
import { projectCategoryPaths } from './creatorCategoryPaths'
import { toCreatorList } from './creatorLists'

const SEGMENT_ORDER = ['MASSIVE', 'TOP', 'MINI', 'FREECAST']

function groupCreators(creators, field, fallbackLabel) {
  return Object.values(creators.reduce((groups, creator) => {
    const labels = field === 'category' ? projectCategoryPaths(toCreatorList(creator[field], ['OTHER']), 1) : toCreatorList(creator[field], [fallbackLabel])
    labels.forEach((label) => {
      const current = groups[label] || { label, count: 0, bookingExpense: 0, segmentCounts: {} }
      current.count += 1
      current.bookingExpense += calculateBookingPricing(creator.cost, creator.extraCost).bookingExpense
      const segment = String(creator.segment || '').trim() || 'Chưa phân khúc'
      current.segmentCounts[segment] = (current.segmentCounts[segment] || 0) + 1
      groups[label] = current
    })
    return groups
  }, {}))
}

export function getCreatorInsights(creators) {
  const availableCreators = creators.filter((creator) => creator.status !== 'Archived')
  const totalBookingExpense = availableCreators.reduce(
    (total, creator) => total + calculateBookingPricing(creator.cost, creator.extraCost).bookingExpense,
    0,
  )

  const categories = groupCreators(creators, 'category', 'Chưa phân loại')
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, 'vi'))
    .map((category) => ({
      ...category,
      percent: creators.length ? Math.round((category.count / creators.length) * 100) : 0,
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

  const leadingCreators = [...availableCreators]
    .sort((left, right) => (Number(right.gmvMonth) || 0) - (Number(left.gmvMonth) || 0))
    .slice(0, 5)
    .map((creator) => ({
      creator,
      bookingExpense: calculateBookingPricing(creator.cost, creator.extraCost).bookingExpense,
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
    leadingCreators,
  }
}
