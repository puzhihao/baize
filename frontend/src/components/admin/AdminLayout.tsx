import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, Users, FileText, TrendingUp, ArrowLeft, FileSearch, SlidersHorizontal } from 'lucide-react'
import { useAuthStore } from '../../store/auth'

const navItems = [
  { to: '/admin', label: '数据大盘', icon: BarChart3, end: true },
  { to: '/admin/users', label: '用户管理', icon: Users },
  { to: '/admin/resumes', label: '简历管理', icon: FileText },
  { to: '/admin/analyses', label: '分析记录', icon: FileSearch },
  { to: '/admin/prompt', label: 'Prompt 配置', icon: SlidersHorizontal },
]

export default function AdminLayout() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="h-14 flex items-center px-5 border-b border-gray-100">
          <TrendingUp className="w-4 h-4 text-primary-600 mr-2" />
          <span className="text-sm font-semibold text-gray-900">管理后台</span>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100 space-y-0.5">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500
                       hover:bg-gray-50 hover:text-gray-900 transition-colors w-full text-left"
          >
            <ArrowLeft className="w-4 h-4" />
            返回前台
          </button>
          <div className="px-3 py-2 text-xs text-gray-400 truncate">{user?.email}</div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
