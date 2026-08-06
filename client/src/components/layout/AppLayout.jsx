import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useApp } from '../../hooks/useApp'
import Toast from '../common/Toast'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { toastMessage } = useApp()

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'is-collapsed' : ''}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />
      <div className="app-content">
        <Topbar onOpenMobile={() => setMobileNavOpen(true)} />
        <Outlet />
      </div>
      <Toast message={toastMessage} />
    </div>
  )
}
