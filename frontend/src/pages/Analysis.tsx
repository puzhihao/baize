import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from 'recharts'
import { resumeApi, type Analysis, type Resume } from '../services/api'

const DIM_LABELS: Record<string, string> = {
  content_completeness: 'Content',
  language_expression: 'Language',
  structure_clarity: 'Structure',
  keyword_density: 'Keywords',
  achievement_quantification: 'Impact',
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
    resumeApi
      .get(Number(id))
      .then(({ data }) => setResume(data))
      .finally(() => setPageLoading(false))
  }, [id])

  const handleAnalyze = async () => {
    if (!resume) return
    setLoading(true)
    setAnalyzeError('')
    try {
      const result = await resumeApi.analyze(resume.id, jdText || undefined, model)
      setAnalysis(result)
    } catch (e: any) {
      setAnalyzeError(e.response?.data?.error || 'Analysis failed, please try again')
    } finally {
      setLoading(false)
    }
  }

  const radarData = analysis?.detail_scores
    ? Object.entries(analysis.detail_scores).map(([key, value]) => ({
        subject: DIM_LABELS[key] || key,
        value,
        fullMark: 100,
      }))
    : []

  const toggleSuggestion = (index: number) => {
    setExpandedSuggestions((prev) => {
      const next = new Set(prev)
      next.has(index) ? next.delete(index) : next.add(index)
      return next
    })
  }

  if (pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    )
  }

  const scoreColor = (score: number) =>
    score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-500'

  const scoreRing = (score: number) => (score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-6">
          <Link to="/dashboard" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="text-sm font-medium text-gray-900">{resume?.title}</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">
            {resume?.file_type?.toUpperCase()}
          </span>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-6">
        <div className="w-2/5 flex-shrink-0">
          <div className="card h-full">
            <div className="border-b border-gray-100 p-4 text-sm font-medium text-gray-700">Resume Content</div>
            <div className="h-[calc(100vh-180px)] overflow-y-auto whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed text-gray-600">
              {resume?.raw_text || 'Resume content is unavailable.'}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <div className="card p-5">
            <div className="flex flex-wrap items-center gap-3">
              <select value={model} onChange={(e) => setModel(e.target.value)} className="input w-auto flex-shrink-0">
                <option value="deepseek">DeepSeek</option>
                <option value="openai">OpenAI</option>
                <option value="claude">Claude</option>
                <option value="minimax">MiniMax</option>
              </select>
              <button onClick={() => setShowJD((prev) => !prev)} className="btn-secondary gap-1.5">
                <Target className="h-4 w-4" />
                {showJD ? 'Hide JD' : 'Add JD'}
              </button>
              <button onClick={handleAnalyze} className="btn-primary" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {loading ? 'Analyzing...' : analysis ? 'Re-run analysis' : 'Start analysis'}
              </button>
            </div>
            {showJD ? (
              <textarea
                className="input mt-3 h-28 resize-none"
                placeholder="Paste the job description here for a match analysis..."
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
              />
            ) : null}
          </div>

          {analyzeError ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {analyzeError}
            </div>
          ) : null}

          {!analysis && !loading ? (
            <div className="card p-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50">
                <TrendingUp className="h-8 w-8 text-primary-400" />
              </div>
              <p className="text-gray-500">Run the AI analysis to get a full review of this resume.</p>
            </div>
          ) : null}

          {analysis ? (
            <>
              <div className="card p-6">
                <div className="flex items-center gap-8">
                  <div className="relative h-32 w-32 flex-shrink-0">
                    <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#f3f4f6" strokeWidth="12" />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke={scoreRing(analysis.total_score)}
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 50}`}
                        strokeDashoffset={`${2 * Math.PI * 50 * (1 - analysis.total_score / 100)}`}
                        className="transition-all duration-700"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-3xl font-bold ${scoreColor(analysis.total_score)}`}>{analysis.total_score}</span>
                      <span className="text-xs text-gray-400">Overall score</span>
                    </div>
                  </div>

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

                <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
                  {Object.entries(analysis.detail_scores).map(([key, value]) => (
                    <div key={key}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-gray-500">{DIM_LABELS[key] || key}</span>
                        <span className={`font-medium ${scoreColor(value)}`}>{value}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${value}%`, background: scoreRing(value) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {analysis.jd_match_score != null && analysis.jd_match_score > 0 ? (
                <div className="card p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                      <Target className="h-4 w-4 text-primary-600" />
                      JD Match
                    </h3>
                    <span className={`text-2xl font-bold ${scoreColor(analysis.jd_match_score)}`}>
                      {analysis.jd_match_score}%
                    </span>
                  </div>
                  {analysis.jd_missing_keys && analysis.jd_missing_keys.length > 0 ? (
                    <div>
                      <p className="mb-2 text-xs text-gray-400">Missing keywords:</p>
                      <div className="flex flex-wrap gap-2">
                        {analysis.jd_missing_keys.map((keyword) => (
                          <span
                            key={keyword}
                            className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs text-orange-700"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {analysis.issues?.length ? (
                <div className="card p-5">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    Issues ({analysis.issues.length})
                  </h3>
                  <ul className="space-y-2">
                    {analysis.issues.map((issue, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm">
                        <IssueIcon level={issue.level} />
                        <div>
                          <span className="font-medium text-gray-700">{issue.section}</span>
                          <span className="mx-1 text-gray-400">/</span>
                          <span className="text-gray-600">{issue.message}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {analysis.suggestions?.length ? (
                <div className="card p-5">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Suggestions ({analysis.suggestions.length})
                  </h3>
                  <ul className="space-y-2">
                    {analysis.suggestions.map((suggestion, index) => (
                      <li key={index} className="overflow-hidden rounded-xl border border-gray-100">
                        <button
                          onClick={() => toggleSuggestion(index)}
                          className="flex w-full items-center justify-between p-4 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <span className="flex items-center gap-2">
                            <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-700">
                              {suggestion.section}
                            </span>
                            <span className="line-clamp-1 text-gray-600">
                              {suggestion.improved.length > 50 ? `${suggestion.improved.slice(0, 50)}...` : suggestion.improved}
                            </span>
                          </span>
                          {expandedSuggestions.has(index) ? (
                            <ChevronUp className="h-4 w-4 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 flex-shrink-0" />
                          )}
                        </button>
                        {expandedSuggestions.has(index) ? (
                          <div className="space-y-3 border-t border-gray-50 px-4 pb-4">
                            {suggestion.original ? (
                              <div className="mt-3">
                                <p className="mb-1 text-xs text-gray-400">Original</p>
                                <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600 line-through decoration-red-300">
                                  {suggestion.original}
                                </p>
                              </div>
                            ) : null}
                            <div>
                              <p className="mb-1 text-xs text-gray-400">Suggested revision</p>
                              <p className="rounded-lg bg-green-50 p-3 text-sm font-medium text-gray-700">
                                {suggestion.improved}
                              </p>
                            </div>
                            <div>
                              <p className="mb-1 text-xs text-gray-400">Reason</p>
                              <p className="text-sm text-gray-600">{suggestion.reason}</p>
                            </div>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function IssueIcon({ level }: { level: string }) {
  if (level === 'error') return <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
  if (level === 'warning') return <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-500" />
  return <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
}
