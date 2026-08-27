function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

function safeFilename(value) {
  return String(value || 'campaign').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'campaign'
}

export function exportCampaignDeliverablesToCsv(campaign, rows) {
  const headers = ['Link TikTok', 'ID TikTok', 'Expense', 'Segment', 'Concept', 'Type', 'GMV / Month', 'Followers', 'Quantity', 'Tiến độ', 'SDHA', 'Product', 'KB, DEMO KOC', 'Meta Ecom Note', 'Brand Feedback', 'Performance (GMV)', 'Air Time', 'Link Air', 'Code Ads', 'Expiry Date Code Ads']
  const values = rows.map((row) => [
    row.tiktokLink, row.tiktokId, row.expense, row.segment, row.concept, row.type, row.gmvMonth, row.followers,
    row.quantity, row.progress, row.sdha ? 'Có' : 'Không', row.product, row.demoLink, row.metaEcomNote,
    row.brandFeedback, row.performance, row.airTime, row.airLink, row.codeAds, row.codeAdsExpiry,
  ])
  const csv = `\uFEFF${[headers, ...values].map((row) => row.map(csvCell).join(',')).join('\n')}`
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${safeFilename(campaign?.name)}-deliverables.csv`
  link.click()
  URL.revokeObjectURL(url)
}
