import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { PAGE_META } from '../../config/navigation'
import Icon from '../common/Icon'
import NotificationsMenu from './NotificationsMenu'
import UserMenu from './UserMenu'

export default function Topbar({ onOpenMobile }) {
  const { pathname } = useLocation()
  const [openMenu, setOpenMenu] = useState(null)
  const currentLabel = PAGE_META[pathname]?.label || 'Dashboard'

  const toggleMenu = (menu) => setOpenMenu((current) => current === menu ? null : menu)

  return (
    <header className="topbar">
      <div className="topbar-title">
        <button className="icon-button mobile-menu" onClick={onOpenMobile} aria-label="Mở thanh điều hướng"><Icon name="menu" /></button>
        <div><span className="eyebrow">MetaEcom Workspace</span><strong>{currentLabel}</strong></div>
      </div>
      <div className="topbar-actions">
        <NotificationsMenu open={openMenu === 'notifications'} onToggle={() => toggleMenu('notifications')} />
        <span className="topbar-divider" />
        <UserMenu open={openMenu === 'user'} onToggle={() => toggleMenu('user')} />
      </div>
    </header>
  )
}
