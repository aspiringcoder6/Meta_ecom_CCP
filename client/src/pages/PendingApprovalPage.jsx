import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/common/Icon'
import { useAuth } from '../hooks/useAuth'

const STATUS_COPY = {
  PENDING: { title: 'Tài khoản đang chờ duyệt', text: 'Admin đã nhận được yêu cầu. Bạn có thể đăng nhập lại sau khi được gán Role và phê duyệt.' },
  REJECTED: { title: 'Yêu cầu chưa được chấp nhận', text: 'Vui lòng xem lý do bên dưới hoặc liên hệ Admin để cập nhật thông tin.' },
  SUSPENDED: { title: 'Tài khoản đang tạm ngưng', text: 'Quyền truy cập của bạn đã bị tạm ngưng. Vui lòng liên hệ Admin.' },
}

export default function PendingApprovalPage() {
  const navigate = useNavigate()
  const { pendingAccount, clearPendingAccount } = useAuth()
  const status = pendingAccount?.status || 'PENDING'
  const copy = STATUS_COPY[status] || STATUS_COPY.PENDING

  const backToLogin = () => {
    clearPendingAccount()
    navigate('/login', { replace: true })
  }

  return (
    <section className="auth-card pending-card">
      <span className={`pending-icon status-${status.toLowerCase()}`}><Icon name={status === 'PENDING' ? 'clock' : 'warning'} size={30} /></span>
      <span className="auth-card-kicker">Trạng thái tài khoản</span>
      <h2>{copy.title}</h2>
      <p>{copy.text}</p>
      {pendingAccount && <div className="pending-account"><strong>{pendingAccount.name || pendingAccount.email}</strong><small>{pendingAccount.email}</small><span>{status === 'PENDING' ? 'Chờ Admin xử lý' : status}</span></div>}
      {pendingAccount?.rejectionReason && <div className="auth-error-banner"><Icon name="warning" size={17} /><span>{pendingAccount.rejectionReason}</span></div>}
      <button className="auth-submit-button" type="button" onClick={backToLogin}>Thử đăng nhập lại <Icon name="chevronRight" size={18} /></button>
      <p className="auth-switch-copy">Cần hỗ trợ? Liên hệ Admin nội bộ hoặc <Link to="/login">quay lại đăng nhập</Link>.</p>
    </section>
  )
}
