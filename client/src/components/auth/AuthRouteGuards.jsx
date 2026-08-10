import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

function SessionLoader() {
  return <div className="session-loader" role="status"><span /><p>Đang kiểm tra phiên đăng nhập...</p></div>
}

export function PublicOnly() {
  const { isAuthenticated, isCheckingSession } = useAuth()
  if (isCheckingSession) return <SessionLoader />
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />
}

export function RequireAuth() {
  const { isAuthenticated, isCheckingSession } = useAuth()
  const location = useLocation()
  if (isCheckingSession) return <SessionLoader />
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

export function RequireRole({ roles }) {
  const { user } = useAuth()
  return roles.includes(user?.role) ? <Outlet /> : <Navigate to="/unauthorized" replace />
}
