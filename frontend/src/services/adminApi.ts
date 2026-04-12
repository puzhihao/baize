import api from './api'

export interface StatsResult {
  total_users: number
  new_users_this_month: number
  total_resumes: number
  new_resumes_this_month: number
  total_analyses: number
  analyses_this_month: number
  avg_score: number
  model_usage: Record<string, number>
  tier_breakdown: Record<string, number>
  daily_trend: { date: string; count: number }[]
  model_daily_trend: Record<string, { date: string; count: number }[]>
}

export interface AdminUserItem {
  id: number
  email: string
  nickname: string
  tier: string
  is_admin: boolean
  is_disabled: boolean
  analysis_used: number
  created_at: string
}

export interface AdminResumeItem {
  id: number
  user_id: number
  user_email: string
  title: string
  file_type: string
  status: string
  created_at: string
}

export interface AdminAnalysisItem {
  id: number
  user_id: number
  user_email: string
  resume_id: number
  resume_title: string
  total_score: number
  jd_match_score: number
  model_used: string
  created_at: string
}

interface PageResult<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export const adminApi = {
  stats: () => api.get<StatsResult>('/admin/stats'),
  users: (page = 1, pageSize = 20, q = '') =>
    api.get<PageResult<AdminUserItem>>('/admin/users', { params: { page, page_size: pageSize, q } }),
  createUser: (data: { email: string; password: string; nickname?: string; tier: string; is_admin: boolean }) =>
    api.post<AdminUserItem>('/admin/users', data),
  updateUser: (id: number, data: { nickname: string; tier: string; is_admin: boolean; is_disabled: boolean; password?: string }) =>
    api.put<AdminUserItem>(`/admin/users/${id}`, data),
  deleteUser: (id: number) =>
    api.delete(`/admin/users/${id}`),
  resumes: (page = 1, pageSize = 20) =>
    api.get<PageResult<AdminResumeItem>>('/admin/resumes', { params: { page, page_size: pageSize } }),
  createResume: (data: { user_id: number; title: string; file_type: string; status: string }) =>
    api.post<AdminResumeItem>('/admin/resumes', data),
  updateResume: (id: number, data: { title: string; status: string }) =>
    api.put<AdminResumeItem>(`/admin/resumes/${id}`, data),
  deleteResume: (id: number) =>
    api.delete(`/admin/resumes/${id}`),
  analyses: (page = 1, pageSize = 20) =>
    api.get<PageResult<AdminAnalysisItem>>('/admin/analyses', { params: { page, page_size: pageSize } }),
  createAnalysis: (data: { resume_id: number; user_id: number; total_score: number; jd_match_score: number; model_used: string }) =>
    api.post<AdminAnalysisItem>('/admin/analyses', data),
  updateAnalysis: (id: number, data: { total_score: number; jd_match_score: number; model_used: string }) =>
    api.put<AdminAnalysisItem>(`/admin/analyses/${id}`, data),
  deleteAnalysis: (id: number) =>
    api.delete(`/admin/analyses/${id}`),
  getPrompt: () =>
    api.get<{ content: string; updated_at: string }>('/admin/prompt'),
  updatePrompt: (content: string) =>
    api.put<{ content: string; updated_at: string }>('/admin/prompt', { content }),
}
