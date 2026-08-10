const STATUS_LABELS = {
  PENDING: 'Chờ duyệt',
  ACTIVE: 'Đang hoạt động',
  REJECTED: 'Đã từ chối',
  SUSPENDED: 'Tạm ngưng',
}

export default function UserStatusBadge({ status }) {
  return <span className={`user-status-badge status-${String(status).toLowerCase()}`}>{STATUS_LABELS[status] || status}</span>
}
