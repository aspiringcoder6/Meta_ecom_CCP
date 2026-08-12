import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { NAV_ITEMS } from '../../config/navigation'
import { useAuth } from '../../hooks/useAuth'
import { CREATOR_TOUR_PENDING_KEY, requestCreatorTour } from '../../utils/creatorTour'
import Icon from '../common/Icon'

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role))
  const canUseCreatorGuide = ['ADMIN', 'CAMPAIGN_MANAGER', 'MEMBER'].includes(user.role)
  const goHome = () => {
    navigate('/dashboard')
    onCloseMobile()
  }
  const startCreatorGuide = () => {
    onCloseMobile()
    if (pathname === '/creators') {
      window.setTimeout(requestCreatorTour, 80)
      return
    }
    window.sessionStorage.setItem(CREATOR_TOUR_PENDING_KEY, '1')
    navigate('/creators')
  }
  const navClass = ({ isActive }) => `nav-item ${isActive ? 'active' : ''}`

  return (
    <>
      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="brand-row">
          <button className="brand" onClick={goHome} aria-label="Dashboard Meta Ecom">
            <img className="brand-mark" src="/Logo/metaIcon.jpg" alt="" />
            <span className="brand-copy"><strong>Meta Ecom</strong><small>Campaign Management Platform</small></span>
          </button>
          <button className="icon-button sidebar-close" onClick={onCloseMobile} aria-label="Đóng thanh điều hướng"><Icon name="close" /></button>
        </div>

        <nav className="sidebar-nav" aria-label="Điều hướng chính">
          <p className="nav-label">Workspace</p>
          {visibleItems.map((item) => (
            <NavLink key={item.path} to={item.path} className={navClass} onClick={onCloseMobile} title={collapsed ? item.label : undefined}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.count && <span className="nav-count">{item.count}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          {user.role === 'ADMIN' && <NavLink to="/settings" className={navClass} onClick={onCloseMobile} title={collapsed ? 'Cài đặt' : undefined}>
            <Icon name="settings" /><span>Cài đặt</span>
          </NavLink>}
          {canUseCreatorGuide && <button type="button" className="help-card" onClick={startCreatorGuide} title={collapsed ? 'Hướng dẫn Creator Management' : undefined}>
            <img className="help-mascot" src="/Avatar/Meers.png" alt="Meers" />
            <div><strong>Meers hướng dẫn</strong><small>Bắt đầu quick tutorial</small></div>
          </button>}
          <button className="collapse-button" onClick={onToggleCollapse}>
            <Icon name="panel" /><span>Thu gọn sidebar</span>
          </button>
        </div>
      </aside>
      {mobileOpen && <button className="sidebar-scrim" aria-label="Đóng thanh điều hướng" onClick={onCloseMobile} />}
    </>
  )
}
