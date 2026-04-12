import { useEffect, useState } from 'react'
import { Users, FileText, Zap, Star, Bot } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from 'recharts'
import { adminApi, type StatsResult } from '../../services/adminApi'

const MODEL_COLORS: Record<string, string> = {
  minimax: '#7c3aed',
  deepseek: '#2563eb',
  openai: '#16a34a',
  claude: '#d97706',
}
const FALLBACK_COLORS = ['#6366f1', '#f43f5e', '#0ea5e9', '#f59e0b']

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: number | string; sub?: string
  icon: React.ElementType; color: string
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
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
    return (
      <div className="p-8 text-sm text-gray-400 animate-pulse">加载中...</div>
    )
  }
  if (!stats) return null

  const modelPieData = Object.entries(stats.model_usage).map(([name, value]) => ({ name, value }))
  const tierBarData = Object.entries(stats.tier_breakdown).map(([name, value]) => ({ name, value }))

  // 最近 30 天各模型调用折线图数据（以 daily_trend 的日期为基准，补 0）
  const models = Object.keys(stats.model_daily_trend)
  const modelLineData = stats.daily_trend.map(({ date }) => {
    const point: Record<string, string | number> = { date }
    models.forEach((m) => {
      const day = stats.model_daily_trend[m].find((d) => d.date === date)
      point[m] = day?.count ?? 0
    })
    return point
  })

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">数据大盘</h1>

      {/* 统计卡 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="总用户数" value={stats.total_users}
          sub={`本月新增 ${stats.new_users_this_month}`}
          icon={Users} color="bg-violet-500" />
        <StatCard label="总简历数" value={stats.total_resumes}
          sub={`本月新增 ${stats.new_resumes_this_month}`}
          icon={FileText} color="bg-blue-500" />
        <StatCard label="总分析次数" value={stats.total_analyses}
          sub={`本月 ${stats.analyses_this_month} 次`}
          icon={Zap} color="bg-emerald-500" />
        <StatCard label="平均评分" value={stats.avg_score.toFixed(1)}
          icon={Star} color="bg-amber-500" />
      </div>

      {/* 趋势折线图 */}
      <div className="card p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-4">最近 30 天分析趋势</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={stats.daily_trend} margin={{ left: -20, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip formatter={(v) => [v, '分析次数']} labelFormatter={(l) => `日期：${l}`} />
            <Line type="monotone" dataKey="count" stroke="#7c3aed" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 模型调用次数折线图 */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-gray-700">最近 30 天模型调用次数</h2>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Bot className="w-3.5 h-3.5" />
            <span>累计调用 {Object.values(stats.model_usage).reduce((a, b) => a + b, 0)} 次</span>
          </div>
        </div>
        {models.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={modelLineData} margin={{ left: -20, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip labelFormatter={(l) => `日期：${l}`} />
              <Legend />
              {models.map((m, i) => (
                <Line key={m} type="monotone" dataKey={m} strokeWidth={2} dot={false}
                  stroke={MODEL_COLORS[m] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-400 text-center py-10">暂无数据</p>
        )}
      </div>

      {/* 模型占比 + Tier 分布 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-4">AI 模型使用占比</h2>
          {modelPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={modelPieData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  } labelLine={false}>
                  {modelPieData.map((entry, i) => (
                    <Cell key={entry.name}
                      fill={MODEL_COLORS[entry.name] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-10">暂无数据</p>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-4">用户套餐分布</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={tierBarData} margin={{ left: -20, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(v) => [v, '用户数']} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {tierBarData.map((entry, i) => (
                  <Cell key={entry.name}
                    fill={entry.name === 'pro' ? '#7c3aed' : '#a78bfa'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
