import { useEffect, useState } from 'react'
import { Bot, FileText, Star, Users, Zap } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { adminApi, type StatsResult } from '../../services/adminApi'

const MODEL_COLORS: Record<string, string> = {
  minimax: '#7c3aed',
  deepseek: '#2563eb',
  openai: '#16a34a',
  claude: '#d97706',
}

const FALLBACK_COLORS = ['#6366f1', '#f43f5e', '#0ea5e9', '#f59e0b']

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string
  value: number | string
  sub?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="card flex items-start gap-4 p-5">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="mb-0.5 text-xs text-gray-500">{label}</p>
        <p className="text-2xl font-bold leading-none text-gray-900">{value}</p>
        {sub ? <p className="mt-1 text-xs text-gray-400">{sub}</p> : null}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.stats().then(({ data }) => setStats(data)).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="animate-pulse p-8 text-sm text-gray-400">Loading...</div>
  }

  if (!stats) return null

  const modelPieData = Object.entries(stats.model_usage).map(([name, value]) => ({ name, value }))
  const tierBarData = Object.entries(stats.tier_breakdown).map(([name, value]) => ({ name, value }))
  const models = Object.keys(stats.model_daily_trend)
  const totalModelCalls = Object.values(stats.model_usage).reduce((sum, count) => sum + count, 0)

  const modelLineData = stats.daily_trend.map(({ date }) => {
    const point: Record<string, string | number> = { date }
    models.forEach((model) => {
      const day = stats.model_daily_trend[model]?.find((item) => item.date === date)
      point[model] = day?.count ?? 0
    })
    return point
  })

  return (
    <div className="space-y-6 p-8">
      <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Total users"
          value={stats.total_users}
          sub={`New this month: ${stats.new_users_this_month}`}
          icon={Users}
          color="bg-violet-500"
        />
        <StatCard
          label="Total resumes"
          value={stats.total_resumes}
          sub={`New this month: ${stats.new_resumes_this_month}`}
          icon={FileText}
          color="bg-blue-500"
        />
        <StatCard
          label="Total analyses"
          value={stats.total_analyses}
          sub={`This month: ${stats.analyses_this_month}`}
          icon={Zap}
          color="bg-emerald-500"
        />
        <StatCard
          label="Average score"
          value={stats.avg_score.toFixed(1)}
          icon={Star}
          color="bg-amber-500"
        />
      </div>

      <div className="card p-5">
        <h2 className="mb-4 text-sm font-medium text-gray-700">Daily analyses in the last 30 days</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={stats.daily_trend} margin={{ left: -20, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(value: string) => value.slice(5)} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip formatter={(value) => [value, 'Analyses']} labelFormatter={(label) => `Date: ${label}`} />
            <Line type="monotone" dataKey="count" stroke="#7c3aed" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">Model usage in the last 30 days</h2>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Bot className="h-3.5 w-3.5" />
            <span>Total calls: {totalModelCalls}</span>
          </div>
        </div>
        {models.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={modelLineData} margin={{ left: -20, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(value: string) => value.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip labelFormatter={(label) => `Date: ${label}`} />
              <Legend />
              {models.map((model, index) => (
                <Line
                  key={model}
                  type="monotone"
                  dataKey={model}
                  stroke={MODEL_COLORS[model] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-10 text-center text-sm text-gray-400">No data</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-medium text-gray-700">AI model share</h2>
          {modelPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={modelPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {modelPieData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={MODEL_COLORS[entry.name] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-center text-sm text-gray-400">No data</p>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-4 text-sm font-medium text-gray-700">User tiers</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={tierBarData} margin={{ left: -20, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(value) => [value, 'Users']} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {tierBarData.map((entry) => (
                  <Cell key={entry.name} fill={entry.name === 'pro' ? '#7c3aed' : '#a78bfa'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
