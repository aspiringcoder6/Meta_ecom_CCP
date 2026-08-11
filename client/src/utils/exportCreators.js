import { calculateBookingPricing } from './pricing'
import { formatCreatorList } from './creatorLists'

export function exportCreatorsToCsv(creators) {
  const headers = [
    'Link TikTok', 'ID TikTok', 'Segment', 'Category', 'Type', 'Cost', 'Extra/FOC (SHDA + hashtag)',
    'Tổng Cast (Đã bao gồm thuế)', 'Booking Expense', 'Followers', 'GMV / Month', 'Scope',
    'Contact', 'Concept', 'Product Focus', 'Tình trạng hợp tác', 'MCN note',
  ]
  const rows = creators.map((creator) => {
    const pricing = calculateBookingPricing(creator.cost, creator.extraCost)
    return [
      creator.tiktokLink, creator.tiktokId, creator.segment, formatCreatorList(creator.category), formatCreatorList(creator.type), creator.cost,
      creator.extraCost, pricing.totalCast, pricing.bookingExpense, creator.followers, creator.gmvMonth,
      creator.scope, creator.contact, creator.concept, creator.productFocus, creator.historicalCampaign, creator.mcnNote,
    ]
  })
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n')

  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'metaecom-creators.csv'
  link.click()
  URL.revokeObjectURL(url)
}
