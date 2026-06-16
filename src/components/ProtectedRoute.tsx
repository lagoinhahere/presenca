import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#060604]">
        <Loader2 className="animate-spin text-[#ffc400]" size={32} />
      </main>
    )
  }

  if (!user || !profile?.is_admin) return <Navigate to="/login" replace />

  return <Outlet />
}
