import { STATUS_LABELS } from '../../config/labels'

export default function StatusBadge({ status }) {
  const className = status.toLowerCase().replaceAll(' ', '-')
  return <span className={`status-badge status-${className}`}><i />{STATUS_LABELS[status] || status}</span>
}
