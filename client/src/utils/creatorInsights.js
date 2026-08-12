import { calculateBookingPricing } from './pricing'
import { projectCategoryPaths } from './creatorCategoryPaths'
import { toCreatorList } from './creatorLists'

function sortCreatorsByPerformance(creators) {
  return [...creators].sort((left, right) =>
    (Number(right.gmvMonth) || 0) - (Number(left.gmvMonth) || 0)
    || (Number(right.followers) || 0) - (Number(left.followers) || 0)
    || String(left.tiktokId || left.name).localeCompare(String(right.tiktokId || right.name), 'vi'),
  )
}

function groupCreatorsByCategory(creators) {
  return Object.values(creators.reduce((groups, creator) => {
    const labels = projectCategoryPaths(toCreatorList(creator.category, ['OTHER']), 1)
    labels.forEach((label) => {
      const current = groups[label] || { label, count: 0, segmentCounts: {}, creators: [] }
      current.count += 1
      current.creators.push(creator)
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

  const categories = groupCreatorsByCategory(creators)
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, 'vi'))
    .map((category) => ({
      ...category,
      percent: creators.length ? Math.round((category.count / creators.length) * 100) : 0,
      topCreators: sortCreatorsByPerformance(category.creators).slice(0, 5),
    }))

  const leadingCreators = sortCreatorsByPerformance(availableCreators).slice(0, 5)

  return {
    totalCreators: creators.length,
    availableCreators,
    availableCount: availableCreators.length,
    archivedCount: creators.length - availableCreators.length,
    totalBookingExpense,
    categories,
    topCategory: categories[0],
    leadingCreators,
  }
}
