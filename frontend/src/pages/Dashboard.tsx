import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, Upload, Clock, TrendingUp, LogOut, Plus, Trash2, BarChart2, Target, Award, Eye, EyeOff, Loader2, X, AlertCircle, Info, ChevronDown, ChevronUp, Wand2, Settings, MoreHorizontal, HelpCircle, User as UserIcon, ShieldCheck, Search } from 'lucide-react'
import { resumeApi, authApi, type Resume, type UserAnalysisItem, type Analysis } from '../services/api'
import { useAuthStore, type AuthState } from '../store/auth'
import { formatDistanceToNow } from '../utils/date'

export default function Dashboard() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarCollapsed, _setSidebarCollapsed] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<'resumes' | 'analyses'>('resumes')
  const [resumes, setResumes] = useState<Resume[]>([])
  const [analyses, setAnalyses] = useState<UserAnalysisItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDeleteResume, setConfirmDeleteResume] = useState<Resume | null>(null)
  const [reportAnalysis, setReportAnalysis] = useState<Analysis | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [confirmDeleteAnalysis, setConfirmDeleteAnalysis] = useState<UserAnalysisItem | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [deletingAnalysisId, setDeletingAnalysisId] = useState<number | null>(null)
  const [selectedResumeIds, setSelectedResumeIds] = useState<Set<number>>(new Set())
  const [selectedAnalysisIds, setSelectedAnalysisIds] = useState<Set<number>>(new Set())
  const [confirmBatchDeleteResumes, setConfirmBatchDeleteResumes] = useState(false)
  const [confirmBatchDeleteAnalyses, setConfirmBatchDeleteAnalyses] = useState(false)
  const [batchDeletingResumes, setBatchDeletingResumes] = useState(false)
  const [batchDeletingAnalyses, setBatchDeletingAnalyses] = useState(false)
  const [resumeSearch, setResumeSearch] = useState('')
  const [analysisSearch, setAnalysisSearch] = useState('')
  const [filterResumeId, setFilterResumeId] = useState<number | null>(null)

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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await resumeApi.delete(id)
      setResumes(prev => prev.filter(r => r.id !== id))
    } finally { setDeletingId(null); setConfirmDeleteResume(null) }
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
    } finally { setDeletingAnalysisId(null); setConfirmDeleteAnalysis(null) }
  }

  const handleBatchDeleteResumes = async () => {
    setBatchDeletingResumes(true)
    try {
      await Promise.all([...selectedResumeIds].map(id => resumeApi.delete(id)))
      setResumes(prev => prev.filter(r => !selectedResumeIds.has(r.id)))
      setSelectedResumeIds(new Set())
      setConfirmBatchDeleteResumes(false)
    } finally { setBatchDeletingResumes(false) }
  }

  const handleBatchDeleteAnalyses = async () => {
    setBatchDeletingAnalyses(true)
    try {
      await Promise.all([...selectedAnalysisIds].map(id => resumeApi.deleteAnalysis(id)))
      setAnalyses(prev => prev.filter(a => !selectedAnalysisIds.has(a.id)))
      setSelectedAnalysisIds(new Set())
      setConfirmBatchDeleteAnalyses(false)
    } finally { setBatchDeletingAnalyses(false) }
  }

  const scoreColor = (s: number) =>
    s >= 80 ? 'text-green-600' : s >= 60 ? 'text-yellow-500' : 'text-red-500'

  const avgScore = analyses.length
    ? Math.round(analyses.reduce((s, a) => s + a.total_score, 0) / analyses.length)
    : null
  const maxScore = analyses.length ? Math.max(...analyses.map(a => a.total_score)) : null
  const jdCount = analyses.filter(a => a.jd_match_score > 0).length
  const thisMonth = analyses.filter(a => {
    const d = new Date(a.created_at)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length
  const FREE_LIMIT = 3
  const remainingFree = user?.tier === 'pro' ? null : Math.max(0, FREE_LIMIT - (user?.monthly_quota_used ?? thisMonth))

  const resumeAnalysisCount = analyses.reduce((acc, a) => {
    acc[a.resume_id] = (acc[a.resume_id] || 0) + 1
    return acc
  }, {} as Record<number, number>)

  // analyses is sorted by created_at DESC, so first hit per resume_id is the latest
  const resumeLatestAnalysis = analyses.reduce((acc, a) => {
    if (!(a.resume_id in acc)) acc[a.resume_id] = { id: a.id, score: a.total_score }
    return acc
  }, {} as Record<number, { id: number; score: number }>)

  const filteredResumes = resumes.filter(r =>
    !resumeSearch || r.title.toLowerCase().includes(resumeSearch.toLowerCase())
  )

  const filteredAnalyses = analyses.filter(a => {
    const matchSearch = !analysisSearch || (a.resume_title || '').toLowerCase().includes(analysisSearch.toLowerCase())
    const matchResume = filterResumeId === null || a.resume_id === filterResumeId
    return matchSearch && matchResume
  })

  const [resumePage, setResumePage] = useState(1)
  const [resumePageSize, setResumePageSize] = useState(10)
  const pagedResumes = filteredResumes.slice((resumePage - 1) * resumePageSize, resumePage * resumePageSize)

  const [analysisPage, setAnalysisPage] = useState(1)
  const [analysisPageSize, setAnalysisPageSize] = useState(10)
  const pagedAnalyses = filteredAnalyses.slice((analysisPage - 1) * analysisPageSize, analysisPage * analysisPageSize)

  const goToResumeAnalyses = (resumeId: number) => {
    setActiveTab('analyses')
    setFilterResumeId(resumeId)
    setAnalysisSearch('')
    setAnalysisPage(1)
    setSelectedAnalysisIds(new Set())
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-60'} flex-shrink-0 bg-white border-r border-gray-100 flex flex-col transition-all duration-200`}>
        <div className="pl-5 pr-4 py-4 border-b border-gray-100 flex items-center justify-between">
          {!sidebarCollapsed && (
            <Link to="/" className="flex items-center gap-2">
              <svg width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="sidebar-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#7c3aed" />
                    <stop offset="1" stopColor="#4338ca" />
                  </linearGradient>
                </defs>
                <rect width="36" height="36" rx="9" fill="url(#sidebar-grad)" />
                <path fill="white" fillOpacity="0.93" d="M9 17 Q9 11 17 11 Q25 11 26 17 Q30 14 31 11 Q30 17 27 19 Q30 22 31 27 Q29 23 26 22 Q25 28 17 28 Q9 28 7 23 Q5 20 9 17 Z" />
                <path fill="white" fillOpacity="0.32" d="M9 24 Q11 29 17 28 Q22 28 23 25 Q17 27 9 24 Z" />
                <circle cx="10.5" cy="19" r="2" fill="#5b21b6" />
                <circle cx="11.2" cy="18.3" r="0.75" fill="white" />
                <path stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" d="M14.5 11 Q13.5 8 14.5 6" />
                <path stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" d="M12 12 Q11 9.5 12 8" />
              </svg>
              <span className="font-bold text-gray-900">简历大师</span>
            </Link>
          )}
          {sidebarCollapsed && (
            <Link to="/" className="mx-auto">
              <svg width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="sidebar-grad-c" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#7c3aed" />
                    <stop offset="1" stopColor="#4338ca" />
                  </linearGradient>
                </defs>
                <rect width="36" height="36" rx="9" fill="url(#sidebar-grad-c)" />
                <path fill="white" fillOpacity="0.93" d="M9 17 Q9 11 17 11 Q25 11 26 17 Q30 14 31 11 Q30 17 27 19 Q30 22 31 27 Q29 23 26 22 Q25 28 17 28 Q9 28 7 23 Q5 20 9 17 Z" />
                <path fill="white" fillOpacity="0.32" d="M9 24 Q11 29 17 28 Q22 28 23 25 Q17 27 9 24 Z" />
                <circle cx="10.5" cy="19" r="2" fill="#5b21b6" />
                <circle cx="11.2" cy="18.3" r="0.75" fill="white" />
                <path stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" d="M14.5 11 Q13.5 8 14.5 6" />
                <path stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" d="M12 12 Q11 9.5 12 8" />
              </svg>
            </Link>
          )}
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavItem icon={<TrendingUp className="w-4 h-4" />} label="我的简历" active={activeTab === 'resumes'} onClick={() => { setActiveTab('resumes'); setSelectedResumeIds(new Set()) }} collapsed={sidebarCollapsed} />
          <NavItem icon={<Clock className="w-4 h-4" />} label="分析记录" active={activeTab === 'analyses'} onClick={() => { setActiveTab('analyses'); setSelectedAnalysisIds(new Set()); setFilterResumeId(null) }} collapsed={sidebarCollapsed} />
        </nav>
        <div className="p-4 border-t border-gray-100 relative" ref={userMenuRef}>
          {/* Popup menu */}
          {showUserMenu && (
            <div className="absolute bottom-full left-2 w-48 mb-2 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50">
              <button
                onClick={() => { setShowUserMenu(false); setShowSettings(true) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4 text-gray-400" />
                系统设置
              </button>
              <button
                onClick={() => { setShowUserMenu(false) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <HelpCircle className="w-4 h-4 text-gray-400" />
                帮助与反馈
              </button>
              <div className="my-1 border-t border-gray-100" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <LogOut className="w-4 h-4 text-gray-400" />
                退出登录
              </button>
            </div>
          )}
          {/* User row */}
          <button
            onClick={() => setShowUserMenu(v => !v)}
            className="w-full flex items-center gap-3 rounded-lg hover:bg-gray-50 pl-0 pr-2 py-2 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium text-sm flex-shrink-0">
              {user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[15px] font-medium text-gray-900 truncate">{user?.username || user?.email}</p>
                </div>
                <MoreHorizontal className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </>
            )}
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

            {/* Resume list */}
            {activeTab === 'resumes' && (
              <>
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
                      <p className="text-xl font-bold text-gray-900">{analyses.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-yellow-50 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-4 h-4 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">平均评分</p>
                      <p className={`text-xl font-bold ${avgScore != null ? scoreColor(avgScore) : 'text-gray-400'}`}>
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
                      <p className={`text-xl font-bold ${maxScore != null ? scoreColor(maxScore) : 'text-gray-400'}`}>
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
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">剩余免费次数</p>
                      {user?.tier === 'pro' ? (
                        <p className="text-xl font-bold text-blue-500">不限</p>
                      ) : (
                        <p className={`text-xl font-bold ${remainingFree === 0 ? 'text-red-500' : 'text-gray-900'}`}>
                          {remainingFree} / {FREE_LIMIT}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">我的简历</h2>
                </div>
                {/* Toolbar */}
                <div className="px-5 py-[10px] flex items-center justify-between gap-4">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="搜索简历..."
                      value={resumeSearch}
                      onChange={e => { setResumeSearch(e.target.value); setResumePage(1) }}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 outline-none focus:border-primary-400 focus:bg-white transition-all w-80"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedResumeIds.size > 0 && (
                      <>
                        <span className="text-xs text-gray-500">已选 <span className="font-semibold text-gray-900">{selectedResumeIds.size}</span> 项</span>
                        <button onClick={() => setSelectedResumeIds(new Set())} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">取消</button>
                      </>
                    )}
                    <button onClick={() => setConfirmBatchDeleteResumes(true)} disabled={selectedResumeIds.size === 0} className="text-xs text-red-400 hover:text-red-600 font-medium flex items-center gap-1 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                      <Trash2 className="w-3.5 h-3.5" />批量删除
                    </button>
                  </div>
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
                ) : filteredResumes.length === 0 ? (
                  <div className="p-10 text-center text-gray-400 text-sm">未找到匹配的简历</div>
                ) : (
                  <>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="w-8 pl-5 pr-0 py-3">
                          <input type="checkbox"
                            className="w-3.5 h-3.5 rounded accent-primary-600 cursor-pointer"
                            checked={filteredResumes.length > 0 && filteredResumes.every(r => selectedResumeIds.has(r.id))}
                            onChange={() => {
                              const allSelected = filteredResumes.every(r => selectedResumeIds.has(r.id))
                              setSelectedResumeIds(allSelected ? new Set() : new Set(filteredResumes.map(r => r.id)))
                            }}
                          />
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 pl-0 pr-3 py-3 w-[28%]">简历名称</th>
                        <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 w-[8%]">类型</th>
                        <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 w-[10%]">分析数</th>
                        <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 w-[17%]">上传时间</th>
                        <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 w-[14%]">综合得分</th>
                        <th className="text-right text-xs font-medium text-gray-500 px-5 py-3 w-[18%]">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {pagedResumes.map((r) => (
                        <tr key={r.id} className={`hover:bg-gray-50 transition-colors ${selectedResumeIds.has(r.id) ? 'bg-primary-50/40' : ''}`}>
                          <td className="pl-5 pr-0 py-3.5">
                            <input type="checkbox"
                              className="w-3.5 h-3.5 rounded accent-primary-600 cursor-pointer"
                              checked={selectedResumeIds.has(r.id)}
                              onChange={() => setSelectedResumeIds(prev => {
                                const next = new Set(prev); next.has(r.id) ? next.delete(r.id) : next.add(r.id); return next
                              })}
                            />
                          </td>
                          <td className="pl-0 pr-3 py-3.5">
                            <span className="font-medium text-gray-900 truncate">{r.title}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              {r.file_type?.toUpperCase() || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            {(resumeAnalysisCount[r.id] || 0) > 0 ? (
                              <button
                                onClick={() => goToResumeAnalyses(r.id)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                              >
                                <BarChart2 className="w-3 h-3" />
                                {resumeAnalysisCount[r.id]}
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                                <BarChart2 className="w-3 h-3" />
                                0
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-gray-500 text-xs">{formatDistanceToNow(r.created_at)}</td>
                          <td className="px-4 py-3.5">
                            {r.id in resumeLatestAnalysis ? (
                              <button
                                onClick={() => handleViewReport(resumeLatestAnalysis[r.id].id)}
                                className="text-xs text-gray-500 hover:opacity-70 transition-opacity"
                              >{resumeLatestAnalysis[r.id].score}</button>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <Link
                                to={`/resume/${r.id}`}
                                className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
                              >
                                开始优化
                              </Link>
                              <span className="text-gray-200">|</span>
                              <button
                                onClick={() => setConfirmDeleteResume(r)}
                                className="text-xs text-gray-400 hover:text-red-500 font-medium transition-colors"
                              >
                                删除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination
                    total={filteredResumes.length}
                    page={resumePage}
                    pageSize={resumePageSize}
                    onPageChange={setResumePage}
                    onPageSizeChange={s => { setResumePageSize(s); setResumePage(1) }}
                    unit="份"
                  />
                  </>
                )}
              </div>
              </>
            )}
            {activeTab === 'analyses' && (
              <div className="card">
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-gray-900">分析记录</h2>
                    {filterResumeId !== null && (
                      <span className="flex items-center gap-1 text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full border border-primary-100">
                        {resumes.find(r => r.id === filterResumeId)?.title || `简历 #${filterResumeId}`}
                        <button onClick={() => { setFilterResumeId(null); setAnalysisPage(1) }} className="hover:text-primary-900 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">共 {filteredAnalyses.length} 条</span>
                </div>
                {/* Toolbar */}
                <div className="px-5 py-[10px] flex items-center justify-between gap-4">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="搜索简历名称..."
                      value={analysisSearch}
                      onChange={e => { setAnalysisSearch(e.target.value); setAnalysisPage(1) }}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 outline-none focus:border-primary-400 focus:bg-white transition-all w-80"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedAnalysisIds.size > 0 && (
                      <>
                        <span className="text-xs text-gray-500">已选 <span className="font-semibold text-gray-900">{selectedAnalysisIds.size}</span> 项</span>
                        <button onClick={() => setSelectedAnalysisIds(new Set())} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">取消</button>
                      </>
                    )}
                    <button onClick={() => setConfirmBatchDeleteAnalyses(true)} disabled={selectedAnalysisIds.size === 0} className="text-xs text-red-400 hover:text-red-600 font-medium flex items-center gap-1 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                      <Trash2 className="w-3.5 h-3.5" />批量删除
                    </button>
                  </div>
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
                ) : filteredAnalyses.length === 0 ? (
                  <div className="p-10 text-center text-gray-400 text-sm">未找到匹配的记录</div>
                ) : (
                  <>
                  <ul className="divide-y divide-gray-50">
                    {pagedAnalyses.map((a) => (
                      <li key={a.id} className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${selectedAnalysisIds.has(a.id) ? 'bg-primary-50/40' : ''}`}>
                        <input type="checkbox"
                          className="w-3.5 h-3.5 rounded accent-primary-600 cursor-pointer flex-shrink-0"
                          checked={selectedAnalysisIds.has(a.id)}
                          onChange={() => setSelectedAnalysisIds(prev => {
                            const next = new Set(prev); next.has(a.id) ? next.delete(a.id) : next.add(a.id); return next
                          })}
                        />
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
                                onClick={() => setConfirmDeleteAnalysis(a)}
                                className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Pagination
                    total={filteredAnalyses.length}
                    page={analysisPage}
                    pageSize={analysisPageSize}
                    onPageChange={setAnalysisPage}
                    onPageSizeChange={s => { setAnalysisPageSize(s); setAnalysisPage(1) }}
                    unit="条"
                  />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Report loading overlay */}
      {reportLoading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 text-sm text-gray-500">加载报告中...</div>
        </div>
      )}

      {/* Batch delete resumes confirm modal */}
      {confirmBatchDeleteResumes && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[520px] p-8 relative">
            <button onClick={() => setConfirmBatchDeleteResumes(false)} className="absolute top-4 right-4 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[16px] font-semibold text-gray-900 mb-1">批量删除简历</h3>
                <p className="text-sm text-gray-500 leading-relaxed">即将永久删除已选的 <span className="font-medium text-gray-800">{selectedResumeIds.size}</span> 份简历，此操作不可撤销。</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmBatchDeleteResumes(false)} className="px-5 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">取消</button>
              <button onClick={handleBatchDeleteResumes} disabled={batchDeletingResumes}
                className="px-5 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-black disabled:opacity-50 transition-colors flex items-center gap-2">
                {batchDeletingResumes && <Loader2 className="w-4 h-4 animate-spin" />}
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch delete analyses confirm modal */}
      {confirmBatchDeleteAnalyses && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[520px] p-8 relative">
            <button onClick={() => setConfirmBatchDeleteAnalyses(false)} className="absolute top-4 right-4 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <BarChart2 className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[16px] font-semibold text-gray-900 mb-1">批量删除分析记录</h3>
                <p className="text-sm text-gray-500 leading-relaxed">即将永久删除已选的 <span className="font-medium text-gray-800">{selectedAnalysisIds.size}</span> 条分析记录，此操作不可撤销。</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmBatchDeleteAnalyses(false)} className="px-5 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">取消</button>
              <button onClick={handleBatchDeleteAnalyses} disabled={batchDeletingAnalyses}
                className="px-5 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-black disabled:opacity-50 transition-colors flex items-center gap-2">
                {batchDeletingAnalyses && <Loader2 className="w-4 h-4 animate-spin" />}
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete resume confirm modal */}
      {confirmDeleteResume && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[520px] p-8 relative">
            <button
              onClick={() => setConfirmDeleteResume(null)}
              className="absolute top-4 right-4 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[16px] font-semibold text-gray-900 mb-1">删除简历</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  即将永久删除简历 <span className="font-medium text-gray-800">「{confirmDeleteResume.title}」</span>，此操作不可撤销。
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteResume(null)}
                className="px-5 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteResume.id)}
                disabled={deletingId === confirmDeleteResume.id}
                className="px-5 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-black disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {deletingId === confirmDeleteResume.id && <Loader2 className="w-4 h-4 animate-spin" />}
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete analysis confirm modal */}
      {confirmDeleteAnalysis && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[520px] p-8 relative">
            <button
              onClick={() => setConfirmDeleteAnalysis(null)}
              className="absolute top-4 right-4 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <BarChart2 className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[16px] font-semibold text-gray-900 mb-1">删除分析记录</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  即将永久删除 <span className="font-medium text-gray-800">「{confirmDeleteAnalysis.resume_title || `简历 #${confirmDeleteAnalysis.resume_id}`}」</span> 的分析记录，此操作不可撤销。
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteAnalysis(null)}
                className="px-5 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDeleteAnalysis(confirmDeleteAnalysis.id)}
                disabled={deletingAnalysisId === confirmDeleteAnalysis.id}
                className="px-5 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-black disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {deletingAnalysisId === confirmDeleteAnalysis.id && <Loader2 className="w-4 h-4 animate-spin" />}
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis report modal */}
      {reportAnalysis && (
        <AnalysisReportModal analysis={reportAnalysis} onClose={() => setReportAnalysis(null)} />
      )}

      {/* Settings modal */}
      {showSettings && (
        <SettingsModal
          user={user}
          onClose={() => setShowSettings(false)}
          onLogout={() => { logout(); navigate('/login') }}
        />
      )}
    </div>
  )
}

function NavItem({ icon, label, active, onClick, collapsed }: {
  icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void; collapsed?: boolean
}) {
  return (
    <button onClick={onClick} title={collapsed ? label : undefined}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${collapsed ? 'justify-center' : ''} ${
        active ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}>
      {icon}
      {!collapsed && label}
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

// ─── Settings Modal ────────────────────────────────────────────────────────

type SettingsTab = 'account'

function SettingsModal({
  user,
  onClose,
  onLogout,
}: {
  user: AuthState['user']
  onClose: () => void
  onLogout: () => void
}) {
  const { setUser } = useAuthStore()
  const [tab, setTab] = useState<SettingsTab>('account')
  const [showChangePw, setShowChangePw] = useState(false)
  const [freshUser, setFreshUser] = useState(user)

  useEffect(() => {
    authApi.me().then(({ data: me }) => {
      const updated = {
        id: me.user_id,
        email: me.email,
        username: me.username,
        tier: me.tier,
        is_admin: me.is_admin,
        analysis_used: me.analysis_used,
        monthly_quota_used: me.monthly_quota_used,
        subscription_end: me.subscription_end,
        created_at: me.created_at,
      }
      setFreshUser(updated)
      setUser(updated)
    }).catch(() => {})
  }, [])

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[640px] flex overflow-hidden" style={{ minHeight: 400 }}>
        {/* Left nav */}
        <div className="w-44 flex-shrink-0 bg-gray-50 border-r border-gray-100 flex flex-col py-5 px-3">
          <p className="text-[16px] font-semibold text-[#0F1115] leading-6 px-3 mb-4">系统设置</p>
          <button
            onClick={() => setTab('account')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              tab === 'account' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <UserIcon className="w-4 h-4 flex-shrink-0" />
            账号管理
          </button>
        </div>

        {/* Right content */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-end px-4 py-3">
            <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 pb-5 space-y-0 divide-y divide-gray-100">
            <InfoRow label="用户名" value={freshUser?.username || '—'} />
            <InfoRow label="邮箱" value={freshUser?.email || '—'} />
            <InfoRow label="账号类型" value={freshUser?.tier === 'pro' ? 'Pro 会员' : '免费用户'} highlight={freshUser?.tier === 'pro'} />
            <InfoRow
              label="注册时间"
              value={freshUser?.created_at ? new Date(freshUser.created_at).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\//g, '-') : '—'}
            />
            <div className="flex items-center justify-between py-3.5">
              <span className="text-sm text-[#0F1115] leading-[25px]">登录密码</span>
              <button
                onClick={() => setShowChangePw(true)}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors mr-6"
              >
                修改
              </button>
            </div>
          </div>
        </div>
      </div>

      {showChangePw && (
        <ChangePwModal
          onClose={() => setShowChangePw(false)}
          onSuccess={() => { setShowChangePw(false); onLogout() }}
        />
      )}
    </div>
  )
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3.5">
      <span className="text-sm text-[#0F1115] leading-[25px]">{label}</span>
      <span className={`text-sm leading-[25px] mr-6 ${highlight ? 'text-primary-600 font-medium' : 'text-[#0F1115]'}`}>{value}</span>
    </div>
  )
}

function ChangePwModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!oldPw) { setError('请输入旧密码'); return }
    if (newPw.length < 6) { setError('新密码至少6位'); return }
    if (newPw !== confirmPw) { setError('两次输入的新密码不一致'); return }
    setSubmitting(true)
    try {
      await authApi.changePassword(oldPw, newPw)
      onSuccess()
    } catch (e: any) {
      setError(e.response?.data?.error || '修改失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary-600" />
            <h3 className="text-[15px] font-semibold text-gray-900">修改密码</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <PwField label="旧密码" value={oldPw} onChange={setOldPw} show={showOld} onToggle={() => setShowOld(v => !v)} placeholder="请输入当前密码" />
          <PwField label="新密码" value={newPw} onChange={setNewPw} show={showNew} onToggle={() => setShowNew(v => !v)} placeholder="至少6位" />
          <PwField label="确认新密码" value={confirmPw} onChange={setConfirmPw} show={showConfirm} onToggle={() => setShowConfirm(v => !v)} placeholder="再次输入新密码" />

          <p className="text-xs text-gray-400 pt-1">修改成功后将自动退出，需重新登录。</p>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              取消
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              确认修改
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PwField({ label, value, onChange, show, onToggle, placeholder }: {
  label: string; value: string; onChange: (v: string) => void
  show: boolean; onToggle: () => void; placeholder: string
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-4 pr-10 py-2.5 text-sm rounded-lg border border-gray-200 outline-none
                     placeholder:text-gray-300 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 transition-all"
        />
        <button type="button" onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

function Pagination({
  total, page, pageSize, onPageChange, onPageSizeChange, unit = '条',
}: {
  total: number; page: number; pageSize: number
  onPageChange: (p: number) => void
  onPageSizeChange: (s: number) => void
  unit?: string
}) {
  const [jumpVal, setJumpVal] = useState('')
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const handleJump = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return
    const n = parseInt(jumpVal)
    if (!isNaN(n) && n >= 1 && n <= totalPages) onPageChange(n)
    setJumpVal('')
  }

  const pages: (number | '…')[] = []
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    const left = Math.max(1, page - 1)
    const right = Math.min(totalPages, page + 1)
    if (left > 1) pages.push(1)
    if (left > 2) pages.push('…')
    for (let i = left; i <= right; i++) pages.push(i)
    if (right < totalPages - 1) pages.push('…')
    if (right < totalPages) pages.push(totalPages)
  }

  const btnBase = 'w-7 h-7 flex items-center justify-center rounded-md border text-xs font-medium transition-colors'
  const btnNormal = 'border-gray-200 text-gray-600 hover:border-primary-400 hover:text-primary-600 bg-white'
  const btnActive = 'border-primary-600 bg-primary-600 text-white'
  const btnDisabled = 'border-gray-100 text-gray-300 cursor-not-allowed bg-white'

  return (
    <div className="flex items-center justify-end gap-2.5 px-5 py-3 border-t border-gray-100">
      <span className="text-xs text-gray-500 mr-1">共 {total} {unit}</span>

      <select
        value={pageSize}
        onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1) }}
        className="h-7 px-2 pr-6 text-xs border border-gray-200 rounded-md bg-white outline-none focus:border-primary-400 text-gray-600 cursor-pointer appearance-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239ca3af'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
      >
        {[10, 20, 50].map(s => <option key={s} value={s}>{s}条/页</option>)}
      </select>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className={`${btnBase} ${page === 1 ? btnDisabled : btnNormal}`}
        >‹</button>

        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-gray-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`${btnBase} ${p === page ? btnActive : btnNormal}`}
            >{p}</button>
          )
        )}

        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className={`${btnBase} ${page === totalPages ? btnDisabled : btnNormal}`}
        >›</button>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        跳至
        <input
          type="text"
          value={jumpVal}
          onChange={e => setJumpVal(e.target.value)}
          onKeyDown={handleJump}
          className="w-9 h-7 text-center border border-gray-200 rounded-md text-xs outline-none focus:border-primary-400 text-gray-700"
        />
        页
      </div>
    </div>
  )
}
