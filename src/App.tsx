import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './components/AdminLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { DashboardPage } from './pages/admin/DashboardPage'
import { CoursesPage } from './pages/admin/CoursesPage'
import { SessionsPage } from './pages/admin/SessionsPage'
import { ReportsPage } from './pages/admin/ReportsPage'
import { SettingsPage } from './pages/admin/SettingsPage'
import { LoginPage } from './pages/LoginPage'
import { CheckinPage } from './pages/public/CheckinPage'
import { QrDisplayPage } from './pages/public/QrDisplayPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/checkin/:token" element={<CheckinPage />} />
      <Route path="/qr/:token" element={<QrDisplayPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
