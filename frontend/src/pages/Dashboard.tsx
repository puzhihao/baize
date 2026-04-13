import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Clock, FileText, LogOut, Plus, ShieldCheck, Trash2, TrendingUp, Upload } from 'lucide-react'
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
    resumeApi
      .list()
      .then(({ data }) => setResumes(data.resumes || []))
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await resumeApi.delete(id)
      setResumes((prev) => prev.filter((resume) => resume.id !== id))
    } finally {
      setDeletingId(null)
      setConfirmId(null)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <aside className="flex w-60 flex-shrink-0 flex-col border-r border-gray-100 bg-white">
        <div className="border-b border-gray-100 p-5">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">Baize Resume</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          <NavItem icon={<TrendingUp className="h-4 w-4" />} label="My resumes" active />
          <NavItem icon={<Clock className="h-4 w-4" />} label="History" onClick={() => {}} />
          {user?.is_admin ? (
            <NavItem icon={<ShieldCheck className="h-4 w-4" />} label="Admin" onClick={() => navigate('/admin')} />
          ) : null}
        </nav>

        <div className="border-t border-gray-100 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700">
              {(user?.username || user?.email)?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{user?.username || user?.email}</p>
              <p className="text-xs text-gray-400">{user?.tier === 'pro' ? 'Pro plan' : 'Free plan'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex w-full items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Hello, {user?.username || 'there'}</h1>
                <p className="mt-1 text-sm text-gray-500">Upload a resume and start improving it.</p>
              </div>
              <Link to="/upload" className="btn-primary">
                <Plus className="h-4 w-4" />
                Upload resume
              </Link>
            </div>

            <div className="mb-8 grid grid-cols-3 gap-4">
              <StatCard icon={<FileText className="h-5 w-5 text-primary-600" />} label="Resumes" value={resumes.length} />
              <StatCard icon={<TrendingUp className="h-5 w-5 text-green-600" />} label="This month" value="-" />
              <StatCard icon={<Upload className="h-5 w-5 text-blue-600" />} label="Plan" value={user?.tier === 'pro' ? 'Pro' : 'Free'} />
            </div>

            <div className="card">
              <div className="flex items-center justify-between border-b border-gray-100 p-5">
                <h2 className="font-semibold text-gray-900">My resumes</h2>
                <Link to="/upload" className="text-sm text-primary-600 hover:underline">
                  + New
                </Link>
              </div>

              {loading ? (
                <div className="p-10 text-center text-sm text-gray-400">Loading...</div>
              ) : resumes.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50">
                    <Upload className="h-8 w-8 text-primary-400" />
                  </div>
                  <p className="mb-4 text-gray-500">No resumes yet. Upload your first one.</p>
                  <Link to="/upload" className="btn-primary">
                    Upload resume
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {resumes.map((resume) => (
                    <li key={resume.id} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50">
                        <FileText className="h-5 w-5 text-primary-600" />
                      </div>
                      <Link to={`/resume/${resume.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900">{resume.title}</p>
                          <p className="mt-0.5 text-xs text-gray-400">
                            {resume.file_type?.toUpperCase()} / {formatDistanceToNow(resume.created_at)}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300 transition-colors group-hover:text-gray-500" />
                      </Link>
                      {confirmId === resume.id ? (
                        <div className="flex flex-shrink-0 items-center gap-2">
                          <span className="text-xs text-gray-500">Confirm delete?</span>
                          <button
                            onClick={() => handleDelete(resume.id)}
                            disabled={deletingId === resume.id}
                            className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600 disabled:opacity-50"
                          >
                            {deletingId === resume.id ? 'Deleting...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(resume.id)}
                          className="flex-shrink-0 rounded-lg p-1.5 text-gray-300 opacity-0 transition-colors hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                          title="Delete resume"
                        >
                          <Trash2 className="h-4 w-4" />
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
    </div>
  )
}

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        active ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50">{icon}</div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}
