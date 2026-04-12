import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, Upload, Clock, TrendingUp, LogOut, Plus, ChevronRight, Trash2, ShieldCheck } from 'lucide-react'
import { resumeApi, type Resume } from '../services/api'
import { useAuthStore } from '../store/auth'
import { formatDistanceToNow } from '../utils/date'

export default function Dashboard() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  useEffect(() => {
    resumeApi.list().then(({ data }) => {
      setResumes(data.resumes || [])
    }).finally(() => setLoading(false))
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await resumeApi.delete(id)
      setResumes(prev => prev.filter(r => r.id !== id))
    } finally {
      setDeletingId(null)
      setConfirmId(null)
    }
  }

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
          <NavItem icon={<TrendingUp className="w-4 h-4" />} label="我的简历" active />
          <NavItem icon={<Clock className="w-4 h-4" />} label="修改历史" onClick={() => {}} />
          {user?.is_admin && (
            <NavItem icon={<ShieldCheck className="w-4 h-4" />} label="管理后台" onClick={() => navigate('/admin')} />
          )}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium text-sm">
              {user?.nickname?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.nickname || user?.email}</p>
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
                  你好，{user?.nickname || '同学'} 👋
                </h1>
                <p className="text-gray-500 text-sm mt-1">上传简历，开始你的求职优化之旅</p>
              </div>
              <Link to="/upload" className="btn-primary">
                <Plus className="w-4 h-4" />
                上传简历
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <StatCard icon={<FileText className="w-5 h-5 text-primary-600" />} label="简历数量" value={resumes.length} />
              <StatCard icon={<TrendingUp className="w-5 h-5 text-green-600" />} label="本月分析" value="—" />
              <StatCard icon={<Upload className="w-5 h-5 text-blue-600" />} label="账号类型" value={user?.tier === 'pro' ? 'Pro' : '免费'} />
            </div>

            {/* Resume list */}
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
          </div>
        </div>
      </main>

      {/* Delete confirm overlay is inline per-row, no modal needed */}
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

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">{icon}</div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}
