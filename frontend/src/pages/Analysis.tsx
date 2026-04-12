import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Loader2, Zap, Target, AlertCircle, Info, CheckCircle2,
  TrendingUp, ChevronDown, ChevronUp, ArrowLeft
} from 'lucide-react'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer
} from 'recharts'
import { resumeApi, type Resume, type Analysis } from '../services/api'

const DIM_LABELS: Record<string, string> = {
  content_completeness: '内容完整',
  language_expression: '语言表达',
  structure_clarity: '结构清晰',
  keyword_density: '关键词',
  achievement_quantification: '成就量化',
}

export default function AnalysisPage() {
  const { id } = useParams()
  const [resume, setResume] = useState<Resume | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [analyzeError, setAnalyzeError] = useState('')
  const [jdText, setJdText] = useState('')
  const [model, setModel] = useState('minimax')
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [showJD, setShowJD] = useState(false)
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!id) return
    resumeApi.get(Number(id)).then(({ data }) => {
      setResume(data)
    }).finally(() => setPageLoading(false))
  }, [id])

  const handleAnalyze = async () => {
    if (!resume) return
    setLoading(true)
    setAnalyzeError('')
    try {
      const data = await resumeApi.analyze(resume.id, jdText || undefined, model)
      setAnalysis(data)
    } catch (e: any) {
      setAnalyzeError(e.response?.data?.error || '分析失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const radarData = analysis?.detail_scores
    ? Object.entries(analysis.detail_scores).map(([k, v]) => ({
        subject: DIM_LABELS[k] || k,
        value: v,
        fullMark: 100,
      }))
    : []

  const toggleSuggestion = (i: number) => {
    setExpandedSuggestions((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    )
  }

  const scoreColor = (s: number) =>
    s >= 80 ? 'text-green-600' : s >= 60 ? 'text-yellow-600' : 'text-red-500'

  const scoreRing = (s: number) =>
    s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link to="/dashboard" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="text-sm font-medium text-gray-900">{resume?.title}</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{resume?.file_type?.toUpperCase()}</span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">
        {/* Left: Resume text */}
        <div className="w-2/5 flex-shrink-0">
          <div className="card h-full">
            <div className="p-4 border-b border-gray-100 font-medium text-sm text-gray-700">简历内容</div>
            <div className="p-4 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed h-[calc(100vh-180px)] overflow-y-auto font-mono">
              {resume?.raw_text || '无法读取简历文本'}
            </div>
          </div>
        </div>

        {/* Right: Analysis */}
        <div className="flex-1 space-y-4">
          {/* Analyze controls */}
          <div className="card p-5">
            <div className="flex items-center gap-3 flex-wrap">
              <select value={model} onChange={(e) => setModel(e.target.value)}
                className="input w-auto flex-shrink-0">
                <option value="deepseek">DeepSeek</option>
                <option value="openai">OpenAI</option>
                <option value="claude">Claude</option>
                <option value="minimax">MiniMax</option>
              </select>
              <button onClick={() => setShowJD(!showJD)} className="btn-secondary gap-1.5">
                <Target className="w-4 h-4" />
                {showJD ? '隐藏 JD' : '添加 JD 匹配'}
              </button>
              <button onClick={handleAnalyze} className="btn-primary" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {loading ? '分析中...' : analysis ? '重新分析' : '开始分析'}
              </button>
            </div>
            {showJD && (
              <textarea
                className="input mt-3 h-28 resize-none"
                placeholder="粘贴目标职位 JD，AI 将对比简历与岗位要求..."
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
              />
            )}
          </div>

          {analyzeError && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {analyzeError}
            </div>
          )}

          {!analysis && !loading && (
            <div className="card p-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-primary-400" />
              </div>
              <p className="text-gray-500">点击「开始分析」，AI 将对你的简历进行全面评估</p>
            </div>
          )}

          {analysis && (
            <>
              {/* Score card */}
              <div className="card p-6">
                <div className="flex items-center gap-8">
                  {/* Ring score */}
                  <div className="flex-shrink-0 relative w-32 h-32">
                    <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#f3f4f6" strokeWidth="12" />
                      <circle
                        cx="60" cy="60" r="50" fill="none"
                        stroke={scoreRing(analysis.total_score)}
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 50}`}
                        strokeDashoffset={`${2 * Math.PI * 50 * (1 - analysis.total_score / 100)}`}
                        className="transition-all duration-700"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-3xl font-bold ${scoreColor(analysis.total_score)}`}>
                        {analysis.total_score}
                      </span>
                      <span className="text-xs text-gray-400">综合评分</span>
                    </div>
                  </div>
                  {/* Radar */}
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height={180}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#f3f4f6" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280' }} />
                        <Radar dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.15} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Dimension bars */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-4">
                  {Object.entries(analysis.detail_scores).map(([k, v]) => (
                    <div key={k}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">{DIM_LABELS[k] || k}</span>
                        <span className={`font-medium ${scoreColor(v)}`}>{v}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${v}%`, background: scoreRing(v) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* JD Match */}
              {analysis.jd_match_score != null && analysis.jd_match_score > 0 && (
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary-600" /> JD 匹配度
                    </h3>
                    <span className={`text-2xl font-bold ${scoreColor(analysis.jd_match_score)}`}>
                      {analysis.jd_match_score}%
                    </span>
                  </div>
                  {analysis.jd_missing_keys && analysis.jd_missing_keys.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-2">缺失关键词：</p>
                      <div className="flex flex-wrap gap-2">
                        {analysis.jd_missing_keys.map((k) => (
                          <span key={k} className="bg-orange-50 text-orange-700 border border-orange-200 text-xs px-2.5 py-1 rounded-full">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Issues */}
              {analysis.issues && analysis.issues.length > 0 && (
                <div className="card p-5">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-500" /> 发现问题（{analysis.issues.length}）
                  </h3>
                  <ul className="space-y-2">
                    {analysis.issues.map((issue, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <IssueIcon level={issue.level} />
                        <div>
                          <span className="font-medium text-gray-700">{issue.section}</span>
                          <span className="text-gray-400 mx-1">·</span>
                          <span className="text-gray-600">{issue.message}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestions */}
              {analysis.suggestions && analysis.suggestions.length > 0 && (
                <div className="card p-5">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" /> 优化建议（{analysis.suggestions.length}）
                  </h3>
                  <ul className="space-y-2">
                    {analysis.suggestions.map((s, i) => (
                      <li key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                        <button
                          onClick={() => toggleSuggestion(i)}
                          className="w-full flex items-center justify-between p-4 text-sm font-medium text-gray-700 hover:bg-gray-50 text-left"
                        >
                          <span className="flex items-center gap-2">
                            <span className="bg-primary-50 text-primary-700 text-xs px-2 py-0.5 rounded-full">{s.section}</span>
                            <span className="text-gray-600 line-clamp-1">{s.improved.slice(0, 50)}...</span>
                          </span>
                          {expandedSuggestions.has(i) ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
                        </button>
                        {expandedSuggestions.has(i) && (
                          <div className="px-4 pb-4 space-y-3 border-t border-gray-50">
                            {s.original && (
                              <div className="mt-3">
                                <p className="text-xs text-gray-400 mb-1">原文</p>
                                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 line-through decoration-red-300">
                                  {s.original}
                                </p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs text-gray-400 mb-1">建议改为</p>
                              <p className="text-sm text-gray-700 bg-green-50 rounded-lg p-3 font-medium">
                                {s.improved}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-1">改进理由</p>
                              <p className="text-sm text-gray-600">{s.reason}</p>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function IssueIcon({ level }: { level: string }) {
  if (level === 'error') return <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
  if (level === 'warning') return <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
  return <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
}
