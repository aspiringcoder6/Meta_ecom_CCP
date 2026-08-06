import { formatCompactCurrency } from '../../utils/formatters'

export default function GmvCategoryPanel({ creators }) {
  const allCategories = Object.values(creators.reduce((result, creator) => {
    const current = result[creator.category] || { label: creator.category, gmv: 0, creators: 0 }
    current.gmv += creator.gmvMonth
    current.creators += 1
    result[creator.category] = current
    return result
  }, {})).sort((a, b) => b.gmv - a.gmv)
  const totalGmv = allCategories.reduce((total, category) => total + category.gmv, 0)
  const categories = allCategories.slice(0, 6)
  const maxGmv = categories[0]?.gmv || 1

  return (
    <article className="panel gmv-category-panel">
      <div className="panel-heading"><div><h2>GMV theo Category</h2><p>Phân bổ GMV / Month của các Creator khả dụng</p></div><div className="panel-total"><span>Tổng GMV</span><strong>{formatCompactCurrency(totalGmv)}</strong></div></div>
      <div className="financial-bar-list">
        {categories.map((category) => <div className="financial-bar-row" key={category.label}><div className="financial-bar-label"><strong>{category.label}</strong><small>{category.creators} Creator</small></div><div className="financial-bar-track"><span style={{ width: `${Math.max(5, (category.gmv / maxGmv) * 100)}%` }} /></div><div className="financial-bar-value"><strong>{formatCompactCurrency(category.gmv)}</strong><small>{totalGmv ? Math.round((category.gmv / totalGmv) * 100) : 0}%</small></div></div>)}
      </div>
    </article>
  )
}
