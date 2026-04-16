import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: {
    id: number
    email: string
    username?: string
    tier: string
    is_admin: boolean
    analysis_used?: number
    monthly_quota_used?: number
    subscription_end?: string | null
    created_at?: string
  } | null
  setTokens: (access: string, refresh: string) => void
  setUser: (user: AuthState['user']) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setTokens: (access, refresh) => set({ accessToken: access, refreshToken: refresh }),
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'baize-auth' }
  )
)
