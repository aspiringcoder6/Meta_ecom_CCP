import Icon from '../common/Icon'

export default function MetricCard({ icon, label, value, trend, trendLabel, tone = 'blue' }) {
  const positive = trend.startsWith('+')
  return (
    <article className="metric-card">
      <div className="metric-card-top">
        <span className={`metric-icon metric-${tone}`}><Icon name={icon} /></span>
        <button className="subtle-icon" aria-label={`Thêm tùy chọn cho ${label}`}><Icon name="more" size={18} /></button>
      </div>
      <span className="metric-label">{label}</span>
      <div className="metric-value-row">
        <strong>{value}</strong>
        <span className={positive ? 'trend-up' : 'trend-neutral'}>{positive && <Icon name="arrowUp" size={13} strokeWidth={2.2} />}{trend}</span>
      </div>
      <small>{trendLabel}</small>
    </article>
  )
}
