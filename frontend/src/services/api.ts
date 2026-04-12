import axios from 'axios'
import { useAuthStore } from '../store/auth'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const url: string = error.config?.url || ''
    if (error.response?.status === 401 && !url.includes('/auth/')) {
      const refreshToken = useAuthStore.getState().refreshToken
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/auth/refresh`,
            { refresh_token: refreshToken }
          )
          useAuthStore.getState().setTokens(data.access_token, data.refresh_token)
          error.config.headers.Authorization = `Bearer ${data.access_token}`
          return api(error.config)
        } catch {
          useAuthStore.getState().logout()
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api

// Auth
export const authApi = {
  register: (username: string, email: string, password: string, code: string) =>
    api.post('/auth/register', { username, email, password, code }),
  login: (account: string, password: string) =>
    api.post<{ access_token: string; refresh_token: string }>('/auth/login', { account, password }),
  me: () => api.get<{
    user_id: number
    email: string
    username?: string
    tier: string
    is_admin: boolean
    analysis_used: number
    subscription_end?: string | null
  }>('/auth/me'),
  sendCode: (email: string) => api.post('/auth/send-code', { email }),
  checkEmail: (email: string) => api.post('/auth/check-email', { email }),
  checkUsername: (username: string) => api.post('/auth/check-username', { username }),
}

// Resumes
export interface Resume {
  id: number
  user_id: number
  title: string
  file_type: string
  raw_text: string
  status: string
  created_at: string
}

export interface ScoreDimensions {
  content_completeness: number
  language_expression: number
  structure_clarity: number
  keyword_density: number
  achievement_quantification: number
}

export interface Issue {
  section: string
  level: 'error' | 'warning' | 'suggestion'
  message: string
}

export interface Suggestion {
  section: string
  original?: string
  improved: string
  reason: string
}

export interface Analysis {
  id: number
  resume_id: number
  total_score: number
  detail_scores: ScoreDimensions
  issues: Issue[]
  suggestions: Suggestion[]
  jd_text?: string
  jd_match_score?: number
  jd_missing_keys?: string[]
  model_used: string
  created_at: string
}

interface RawAnalysis {
  id: number
  resume_id: number
  total_score: number
  detail_scores: string | ScoreDimensions
  issues: string | Issue[]
  suggestions: string | Suggestion[]
  jd_text?: string
  jd_match_score?: number
  jd_missing_keys?: string | string[]
  model_used: string
  created_at: string
}

export const resumeApi = {
  upload: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post<Resume>('/resumes/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  createFromText: (title: string, text: string) =>
    api.post<Resume>('/resumes/text', { title, text }),
  list: () => api.get<{ resumes: Resume[] }>('/resumes'),
  get: (id: number) => api.get<Resume>(`/resumes/${id}`),
  delete: (id: number) => api.delete(`/resumes/${id}`),
  analyze: async (id: number, jdText?: string, model?: string): Promise<Analysis> => {
    const { data } = await api.post<RawAnalysis>(`/resumes/${id}/analyze`, { jd_text: jdText, model }, {
      timeout: 180000,
    })
    return {
      ...data,
      detail_scores: typeof data.detail_scores === 'string' ? JSON.parse(data.detail_scores) : data.detail_scores,
      issues: typeof data.issues === 'string' ? JSON.parse(data.issues) : data.issues,
      suggestions: typeof data.suggestions === 'string' ? JSON.parse(data.suggestions) : data.suggestions,
      jd_missing_keys: typeof data.jd_missing_keys === 'string' ? JSON.parse(data.jd_missing_keys || '[]') : (data.jd_missing_keys ?? []),
    } as Analysis
  },
  versions: (id: number) => api.get(`/resumes/${id}/versions`),
}

// Payment
export const paymentApi = {
  createOrder: (plan: string) =>
    api.post<{ id: number; plan: string; amount: number; status: string }>('/payment/orders', { plan }),
  confirmPayment: (orderId: number) =>
    api.post<{ message: string }>(`/payment/orders/${orderId}/confirm`),
}
