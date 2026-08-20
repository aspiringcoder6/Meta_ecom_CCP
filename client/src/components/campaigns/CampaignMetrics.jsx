import Icon from '../common/Icon'
import { formatCompactCurrency } from '../../utils/formatters'

export default function CampaignMetrics({ campaigns }) {
  const running = campaigns.filter((campaign) => campaign.status === 'RUNNING').length
  const draft = campaigns.filter((campaign) => campaign.status === 'DRAFT').length
  const budget = campaigns.filter((campaign) => campaign.status !== 'CANCELLED').reduce((total, campaign) => total + (Number(campaign.totalBudget) || 0), 0)
  const metrics = [
    { icon: 'briefcase', label: 'Tổng Campaign', value: campaigns.length, detail: `${running} đang chạy` },
    { icon: 'trending', label: 'Đang triển khai', value: running, detail: 'Campaign đang chạy' },
    { icon: 'edit', label: 'Đang soạn', value: draft, detail: 'Campaign Draft' },
    { icon: 'sparkles', label: 'Tổng ngân sách', value: formatCompactCurrency(budget), detail: 'Không gồm campaign đã huỷ' },
  ]
  return <section className="campaign-metrics">{metrics.map((metric) => <article key={metric.label}><span><Icon name={metric.icon} size={20} /></span><div><small>{metric.label}</small><strong>{metric.value}</strong><em>{metric.detail}</em></div></article>)}</section>
}
