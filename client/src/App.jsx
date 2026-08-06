import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import AppProvider from './context/AppProvider'
import CreatorsPage from './pages/CreatorsPage'
import DashboardPage from './pages/DashboardPage'
import PlaceholderPage from './pages/PlaceholderPage'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="creators" element={<CreatorsPage />} />
            <Route path="campaigns" element={<PlaceholderPage />} />
            <Route path="deliverables" element={<PlaceholderPage />} />
            <Route path="reviews" element={<PlaceholderPage />} />
            <Route path="team" element={<PlaceholderPage />} />
            <Route path="settings" element={<PlaceholderPage />} />
            <Route path="*" element={<PlaceholderPage />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  )
}
