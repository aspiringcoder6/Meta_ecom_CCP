import { Link, Outlet } from 'react-router-dom'
import { AUTH_DEMO_NOTICE } from '../../config/auth'
import Icon from '../common/Icon'

const BENEFITS = [
  { icon: 'users', title: 'Quản lý một cách dễ dàng', text: 'Rút ngắn quy trình quản lí và tích hợp tất cả dữ liệu cần trong một ứng dụng' },
  { icon: 'briefcase', title: 'Tự động hóa', text: 'Tự động hóa các công thức tính toán và hiển thị trực quan số liệu cần thiết' },
]

export default function AuthLayout() {
  return (
    <div className="auth-shell">
      <aside className="auth-brand-panel">
        <Link className="auth-brand" to="/login"><img src="/Logo/metaIcon.jpg" alt="Meta Ecom" /><span><strong>Meta Ecom</strong><small>Creator Campaign Platform</small></span></Link>
        <div className="auth-brand-copy"><span className="auth-eyebrow">CREATOR CAMPAIGN PLATFORM</span><h1>Quản lý Content Creators,<br />Theo dõi campaigns.</h1><p>Nột công cụ hỗ trợ workflow end-to-end để có thể hỗ trợ các quy trình quản lý và theo dõi content creators và campaigns một cách bảo mật, tiện lợi và nhanh chóng</p></div>
        <div className="auth-benefit-list">
          {BENEFITS.map((benefit) => <div key={benefit.title}><span><Icon name={benefit.icon} size={19} /></span><div><strong>{benefit.title}</strong><small>{benefit.text}</small></div></div>)}
        </div>
        <small className="auth-brand-footer">© 2026 Meta Ecom · Internal Workspace</small>
      </aside>
      <main className="auth-main">
        <div className="auth-mobile-brand"><img src="/Logo/metaIcon.jpg" alt="" /><span><strong>Meta Ecom</strong><small>Creator Campaign Platform</small></span></div>
        <Outlet />
        <p className="auth-demo-notice"><Icon name="shield" size={14} />{AUTH_DEMO_NOTICE}</p>
      </main>
    </div>
  )
}
