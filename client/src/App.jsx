import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AuthLayout from './components/auth/AuthLayout'
import { PublicOnly, RequireAuth, RequireRole } from './components/auth/AuthRouteGuards'
import AppLayout from './components/layout/AppLayout'
import AppProvider from './context/AppProvider'
import AuthProvider from './context/AuthProvider'
import CreatorsPage from './pages/CreatorsPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import PendingApprovalPage from './pages/PendingApprovalPage'
import PlaceholderPage from './pages/PlaceholderPage'
import SignupPage from './pages/SignupPage'
import UnauthorizedPage from './pages/UnauthorizedPage'
import UserManagementPage from './pages/UserManagementPage'
import './App.css'

const WORK_ROLES = ['ADMIN', 'CAMPAIGN_MANAGER', 'MEMBER']

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route element={<PublicOnly />}>
            <Route element={<AuthLayout />}>
              <Route path="login" element={<LoginPage />} />
              <Route path="signup" element={<SignupPage />} />
              <Route path="pending" element={<PendingApprovalPage />} />
            </Route>
          </Route>
          <Route element={<RequireAuth />}>
            <Route element={<AppProvider><AppLayout /></AppProvider>}>
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="unauthorized" element={<UnauthorizedPage />} />
              <Route element={<RequireRole roles={WORK_ROLES} />}>
                <Route path="creators" element={<CreatorsPage />} />
                <Route path="campaigns" element={<PlaceholderPage />} />
                <Route path="deliverables" element={<PlaceholderPage />} />
              </Route>
              <Route element={<RequireRole roles={['ADMIN', 'CAMPAIGN_MANAGER']} />}>
                <Route path="reviews" element={<PlaceholderPage />} />
              </Route>
              <Route element={<RequireRole roles={['ADMIN']} />}>
                <Route path="team" element={<UserManagementPage />} />
                <Route path="settings" element={<PlaceholderPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
