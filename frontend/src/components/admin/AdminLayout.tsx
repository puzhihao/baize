import {
  ArrowLeft,
  BarChart3,
  FileSearch,
  FileText,
  SlidersHorizontal,
  TrendingUp,
  Users,
} from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: BarChart3, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/resumes', label: 'Resumes', icon: FileText },
  { to: '/admin/analyses', label: 'Analyses', icon: FileSearch },
  { to: '/admin/prompt', label: 'Prompt', icon: SlidersHorizontal },
]

export default function AdminLayout() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="flex w-56 flex-shrink-0 flex-col border-r border-gray-100 bg-white">
        <div className="flex h-14 items-center border-b border-gray-100 px-5">
          <TrendingUp className="mr-2 h-4 w-4 text-primary-600" />
          <span className="text-sm font-semibold text-gray-900">Admin Panel</span>
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary-50 font-medium text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-0.5 border-t border-gray-100 p-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to app
          </button>
          <div className="truncate px-3 py-2 text-xs text-gray-400">{user?.email}</div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
