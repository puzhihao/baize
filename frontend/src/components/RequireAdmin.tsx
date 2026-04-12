import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { accessToken, user } = useAuthStore()
  if (!accessToken) return <Navigate to="/login" replace />
  if (!user?.is_admin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
