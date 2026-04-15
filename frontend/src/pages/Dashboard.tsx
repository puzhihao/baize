import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, Upload, Clock, TrendingUp, LogOut, Plus, ChevronRight, Trash2, BarChart2, Target, Award, Eye, X, AlertCircle, Info, ChevronDown, ChevronUp, Wand2 } from 'lucide-react'
import { resumeApi, type Resume, type UserAnalysisItem, type Analysis } from '../services/api'
import { useAuthStore } from '../store/auth'
import { formatDistanceToNow } from '../utils/date'

export default function Dashboard() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'resumes' | 'analyses'>('resumes')
  const [resumes, setResumes] = useState<Resume[]>([])
  const [analyses, setAnalyses] = useState<UserAnalysisItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [reportAnalysis, setReportAnalysis] = useState<Analysis | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [confirmAnalysisId, setConfirmAnalysisId] = useState<number | null>(null)
  const [deletingAnalysisId, setDeletingAnalysisId] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([
      resumeApi.list(),
      resumeApi.listAnalyses(),
    ]).then(([r, a]) => {
      setResumes(r.data.resumes || [])
      setAnalyses(a.data.analyses || [])
    }).finally(() => setLoading(false))
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await resumeApi.delete(id)
      setResumes(prev => prev.filter(r => r.id !== id))
    } finally { setDeletingId(null); setConfirmId(null) }
  }

  const handleViewReport = async (id: number) => {
    setReportLoading(true)
    try {
      const data = await resumeApi.getAnalysis(id)
      setReportAnalysis(data)
    } finally { setReportLoading(false) }
  }

  const handleDeleteAnalysis = async (id: number) => {
    setDeletingAnalysisId(id)
    try {
      await resumeApi.deleteAnalysis(id)
      setAnalyses(prev => prev.filter(a => a.id !== id))
    } finally { setDeletingAnalysisId(null); setConfirmAnalysisId(null) }
  }

  const scoreColor = (s: number) =>
    s >= 80 ? 'text-green-600' : s >= 60 ? 'text-yellow-500' : 'text-red-500'

  const avgScore = analyses.length
    ? Math.round(analyses.reduce((s, a) => s + a.total_score, 0) / analyses.length)
    : null
  const maxScore = analyses.length ? Math.max(...analyses.map(a => a.total_score)) : null
  const jdCount = analyses.filter(a => a.jd_match_score > 0).length

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">白泽简历</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavItem icon={<TrendingUp className="w-4 h-4" />} label="我的简历" active={activeTab === 'resumes'} onClick={() => setActiveTab('resumes')} />
          <NavItem icon={<Clock className="w-4 h-4" />} label="分析记录" active={activeTab === 'analyses'} onClick={() => setActiveTab('analyses')} />
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium text-sm">
              {user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.username || user?.email}</p>
              <p className="text-xs text-gray-400">{user?.tier === 'pro' ? 'Pro 会员' : '免费版'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 w-full">
            <LogOut className="w-4 h-4" /> 退出登录
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  你好，{user?.username || '同学'} 👋
                </h1>
                <p className="text-gray-500 text-sm mt-1">开始你的求职优化之旅吧</p>
              </div>
              {activeTab === 'resumes' && (
                <div className="flex items-center gap-2">
                  <Link to="/generate" className="btn-secondary flex items-center gap-1.5">
                    <Wand2 className="w-4 h-4" />
                    AI 写简历
                  </Link>
                  <Link to="/upload" className="btn-primary">
                    <Plus className="w-4 h-4" />
                    上传简历
                  </Link>
                </div>
              )}
            </div>

            {/* Overview */}
            <div className="card p-5 mb-6">
              <h2 className="font-semibold text-gray-900 mb-4">概览</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">简历数量</p>
                    <p className="text-xl font-bold text-gray-900">{resumes.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                    <BarChart2 className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">分析次数</p>
                    <p className="text-xl font-bold text-gray-900">{analyses.length || 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Upload className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">账号类型</p>
                    <p className="text-xl font-bold text-gray-900">{user?.tier === 'pro' ? 'Pro' : '免费'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-yellow-50 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">平均评分</p>
                    <p className={`text-xl font-bold ${avgScore != null ? (avgScore >= 80 ? 'text-green-600' : avgScore >= 60 ? 'text-yellow-500' : 'text-red-500') : 'text-gray-400'}`}>
                      {avgScore ?? '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <Award className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">最高评分</p>
                    <p className={`text-xl font-bold ${maxScore != null ? (maxScore >= 80 ? 'text-green-600' : maxScore >= 60 ? 'text-yellow-500' : 'text-red-500') : 'text-gray-400'}`}>
                      {maxScore ?? '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <Target className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">JD 匹配次数</p>
                    <p className="text-xl font-bold text-gray-900">{jdCount}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Resume list */}
            {activeTab === 'resumes' && (
              <div className="card">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">我的简历</h2>
                  <Link to="/upload" className="text-sm text-primary-600 hover:underline">+ 新增</Link>
                </div>
                {loading ? (
                  <div className="p-10 text-center text-gray-400 text-sm">加载中...</div>
                ) : resumes.length === 0 ? (
                  <div className="p-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
                      <Upload className="w-8 h-8 text-primary-400" />
                    </div>
                    <p className="text-gray-500 mb-4">还没有简历，上传你的第一份简历吧</p>
                    <Link to="/upload" className="btn-primary">上传简历</Link>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {resumes.map((r) => (
                      <li key={r.id} className="group flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-primary-600" />
                        </div>
                        <Link to={`/resume/${r.id}`} className="flex-1 min-w-0 flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900">{r.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{r.file_type?.toUpperCase()} · {formatDistanceToNow(r.created_at)}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                        </Link>
                        {confirmId === r.id ? (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-gray-500">确认删除？</span>
                            <button
                              onClick={() => handleDelete(r.id)}
                              disabled={deletingId === r.id}
                              className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                            >
                              {deletingId === r.id ? '删除中' : '确认'}
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmId(r.id)}
                            className="flex-shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                            title="删除简历"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Analyses list */}
            {activeTab === 'analyses' && (
              <div className="card">
                <div className="p-5 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900">分析记录</h2>
                </div>
                {loading ? (
                  <div className="p-10 text-center text-gray-400 text-sm">加载中...</div>
                ) : analyses.length === 0 ? (
                  <div className="p-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
                      <BarChart2 className="w-8 h-8 text-primary-400" />
                    </div>
                    <p className="text-gray-500">还没有分析记录</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {analyses.map((a) => (
                      <li key={a.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                          <BarChart2 className="w-5 h-5 text-primary-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{a.resume_title || `简历 #${a.resume_id}`}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{a.model_used} · {formatDistanceToNow(a.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-xs text-gray-400">综合评分</p>
                            <p className={`text-lg font-bold ${scoreColor(a.total_score)}`}>{a.total_score}</p>
                          </div>
                          {a.jd_match_score > 0 && (
                            <div className="text-right">
                              <p className="text-xs text-gray-400">JD 匹配</p>
                              <p className={`text-lg font-bold ${scoreColor(a.jd_match_score)}`}>{a.jd_match_score}</p>
                            </div>
                          )}
                          {confirmAnalysisId === a.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">确认删除？</span>
                              <button
                                onClick={() => handleDeleteAnalysis(a.id)}
                                disabled={deletingAnalysisId === a.id}
                                className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                              >
                                {deletingAnalysisId === a.id ? '删除中' : '确认'}
                              </button>
                              <button
                                onClick={() => setConfirmAnalysisId(null)}
                                className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleViewReport(a.id)}
                                className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors"
                                title="查看报告"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                查看报告
                              </button>
                              <button
                                onClick={() => setConfirmAnalysisId(a.id)}
                                className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Delete confirm overlay is inline per-row, no modal needed */}

      {/* Report loading overlay */}
      {reportLoading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 text-sm text-gray-500">加载报告中...</div>
        </div>
      )}

      {/* Analysis report modal */}
      {reportAnalysis && (
        <AnalysisReportModal analysis={reportAnalysis} onClose={() => setReportAnalysis(null)} />
      )}
    </div>
  )
}

function NavItem({ icon, label, active, onClick }: {
  icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void
}) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}>
      {icon}
      {label}
    </button>
  )
}

const DIM_LABELS: Record<string, string> = {
  content_completeness: '内容完整',
  language_expression: '语言表达',
  structure_clarity: '结构清晰',
  keyword_density: '关键词',
  achievement_quantification: '成就量化',
}

function IssueIcon({ level }: { level: string }) {
  if (level === 'error') return <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
  if (level === 'warning') return <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
  return <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
}

function AnalysisReportModal({ analysis, onClose }: { analysis: Analysis; onClose: () => void }) {
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<number>>(new Set())

  const scoreColor = (s: number) =>
    s >= 80 ? 'text-green-600' : s >= 60 ? 'text-yellow-500' : 'text-red-500'

  const circumference = 2 * Math.PI * 44
  const offset = circumference - (analysis.total_score / 100) * circumference

  const radarData = analysis.detail_scores
    ? Object.entries(analysis.detail_scores).map(([k, v]) => ({
        subject: DIM_LABELS[k] || k, value: v, fullMark: 100,
      }))
    : []

  const toggleSuggestion = (i: number) =>
    setExpandedSuggestions(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">分析报告</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-5">
          {/* Score ring + dimensions */}
          <div className="bg-white rounded-xl p-5 flex gap-6 items-center">
            <div className="flex-shrink-0 flex flex-col items-center gap-1">
              <svg width="110" height="110" viewBox="0 0 110 110">
                <circle cx="55" cy="55" r="44" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                <circle cx="55" cy="55" r="44" fill="none"
                  stroke={analysis.total_score >= 80 ? '#10b981' : analysis.total_score >= 60 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={circumference} strokeDashoffset={offset}
                  transform="rotate(-90 55 55)" />
                <text x="55" y="52" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#111827">{analysis.total_score}</text>
                <text x="55" y="68" textAnchor="middle" fontSize="11" fill="#9ca3af">综合评分</text>
              </svg>
              {(analysis.jd_match_score ?? 0) > 0 && (
                <p className={`text-sm font-semibold ${scoreColor(analysis.jd_match_score!)}`}>
                  JD 匹配 {analysis.jd_match_score}
                </p>
              )}
            </div>
            {radarData.length > 0 && (
              <div className="flex-1 grid grid-cols-2 gap-2">
                {radarData.map(d => (
                  <div key={d.subject}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">{d.subject}</span>
                      <span className={`font-medium ${scoreColor(d.value)}`}>{d.value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${d.value}%`, backgroundColor: d.value >= 80 ? '#10b981' : d.value >= 60 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* JD missing keys */}
          {(analysis.jd_missing_keys?.length ?? 0) > 0 && (
            <div className="bg-white rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-orange-500" />
                <h3 className="font-medium text-gray-900 text-sm">JD 缺失关键词</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {analysis.jd_missing_keys!.map((k, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-xs border border-orange-200">{k}</span>
                ))}
              </div>
            </div>
          )}

          {/* Issues */}
          {analysis.issues?.length > 0 && (
            <div className="bg-white rounded-xl p-5">
              <h3 className="font-medium text-gray-900 text-sm mb-3">问题列表</h3>
              <div className="space-y-2">
                {analysis.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-gray-50">
                    <IssueIcon level={issue.level} />
                    <div>
                      <span className="text-xs text-gray-400 mr-2">{issue.section}</span>
                      <span className="text-sm text-gray-700">{issue.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {analysis.suggestions?.length > 0 && (
            <div className="bg-white rounded-xl p-5">
              <h3 className="font-medium text-gray-900 text-sm mb-3">优化建议</h3>
              <div className="space-y-2">
                {analysis.suggestions.map((s, i) => (
                  <div key={i} className="border border-gray-100 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSuggestion(i)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 flex-shrink-0">{s.section}</span>
                        <span className="text-sm text-gray-700 truncate">{s.reason}</span>
                      </div>
                      {expandedSuggestions.has(i) ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    </button>
                    {expandedSuggestions.has(i) && (
                      <div className="px-4 pb-4 space-y-2 bg-gray-50">
                        {s.original && (
                          <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                            <p className="text-xs text-red-400 mb-1">原文</p>
                            <p className="text-sm text-gray-700">{s.original}</p>
                          </div>
                        )}
                        <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                          <p className="text-xs text-green-600 mb-1">建议</p>
                          <p className="text-sm text-gray-700">{s.improved}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
