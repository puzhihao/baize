import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { adminApi, type AdminAnalysisItem } from '../../services/adminApi'

const MODEL_OPTIONS = ['minimax', 'deepseek', 'openai', 'claude']

const MODEL_COLOR: Record<string, string> = {
  minimax: 'bg-violet-100 text-violet-700',
  deepseek: 'bg-blue-100 text-blue-700',
  openai: 'bg-green-100 text-green-700',
  claude: 'bg-amber-100 text-amber-700',
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-500'
  return <span className={`font-semibold ${color}`}>{score}</span>
}

interface AnalysisFormData {
  resume_id: string
  user_id: string
  total_score: string
  jd_match_score: string
  model_used: string
}

const defaultForm: AnalysisFormData = {
  resume_id: '',
  user_id: '',
  total_score: '0',
  jd_match_score: '0',
  model_used: 'minimax',
}

interface CreateModalProps {
  onClose: () => void
  onSave: (data: AnalysisFormData) => Promise<void>
}

function CreateModal({ onClose, onSave }: CreateModalProps) {
  const [form, setForm] = useState<AnalysisFormData>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      await onSave(form)
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Request failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Create analysis</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Resume ID <span className="text-red-500">*</span>
              </label>
              <input
                className="input w-full"
                type="number"
                min="1"
                required
                value={form.resume_id}
                onChange={(e) => setForm((prev) => ({ ...prev, resume_id: e.target.value }))}
                placeholder="Resume ID"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                User ID <span className="text-red-500">*</span>
              </label>
              <input
                className="input w-full"
                type="number"
                min="1"
                required
                value={form.user_id}
                onChange={(e) => setForm((prev) => ({ ...prev, user_id: e.target.value }))}
                placeholder="User ID"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Total score</label>
              <input
                className="input w-full"
                type="number"
                min="0"
                max="100"
                value={form.total_score}
                onChange={(e) => setForm((prev) => ({ ...prev, total_score: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">JD match score</label>
              <input
                className="input w-full"
                type="number"
                min="0"
                max="100"
                value={form.jd_match_score}
                onChange={(e) => setForm((prev) => ({ ...prev, jd_match_score: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Model</label>
            <select
              className="input w-full"
              value={form.model_used}
              onChange={(e) => setForm((prev) => ({ ...prev, model_used: e.target.value }))}
            >
              {MODEL_OPTIONS.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface EditModalProps {
  item: AdminAnalysisItem
  onClose: () => void
  onSave: (data: { total_score: number; jd_match_score: number; model_used: string }) => Promise<void>
}

function EditModal({ item, onClose, onSave }: EditModalProps) {
  const [totalScore, setTotalScore] = useState(String(item.total_score))
  const [jdScore, setJdScore] = useState(String(item.jd_match_score))
  const [modelUsed, setModelUsed] = useState(item.model_used)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      await onSave({
        total_score: Number(totalScore),
        jd_match_score: Number(jdScore),
        model_used: modelUsed,
      })
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Request failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Edit analysis</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-xs text-gray-400">
          Resume: {item.resume_title || `#${item.resume_id}`} / User: {item.user_email}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Total score</label>
              <input
                className="input w-full"
                type="number"
                min="0"
                max="100"
                value={totalScore}
                onChange={(e) => setTotalScore(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">JD match score</label>
              <input
                className="input w-full"
                type="number"
                min="0"
                max="100"
                value={jdScore}
                onChange={(e) => setJdScore(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Model</label>
            <select className="input w-full" value={modelUsed} onChange={(e) => setModelUsed(e.target.value)}>
              {MODEL_OPTIONS.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminAnalyses() {
  const [items, setItems] = useState<AdminAnalysisItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem] = useState<AdminAnalysisItem | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const pageSize = 20

  const load = () => {
    setLoading(true)
    adminApi
      .analyses(page, pageSize)
      .then(({ data }) => {
        setItems(data.items)
        setTotal(data.total)
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [page])

  const totalPages = Math.ceil(total / pageSize)

  const handleCreate = async (data: AnalysisFormData) => {
    await adminApi.createAnalysis({
      resume_id: Number(data.resume_id),
      user_id: Number(data.user_id),
      total_score: Number(data.total_score),
      jd_match_score: Number(data.jd_match_score),
      model_used: data.model_used,
    })
    load()
  }

  const handleEdit = async (data: { total_score: number; jd_match_score: number; model_used: string }) => {
    if (!editItem) return
    await adminApi.updateAnalysis(editItem.id, data)
    load()
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)

    try {
      await adminApi.deleteAnalysis(id)
      setItems((prev) => prev.filter((analysis) => analysis.id !== id))
      setTotal((count) => count - 1)
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  return (
    <div className="space-y-5 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Analyses</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Total: {total}</span>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Create analysis
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              {['ID', 'Resume', 'User', 'Total', 'JD Match', 'Model', 'Created', 'Actions'].map((header) => (
                <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  No data
                </td>
              </tr>
            ) : (
              items.map((analysis) => (
                <tr key={analysis.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{analysis.id}</td>
                  <td className="max-w-[160px] truncate px-4 py-3 text-gray-900">{analysis.resume_title || '-'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{analysis.user_email}</td>
                  <td className="px-4 py-3">
                    <ScoreBadge score={analysis.total_score} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {analysis.jd_match_score > 0 ? <ScoreBadge score={analysis.jd_match_score} /> : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        MODEL_COLOR[analysis.model_used] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {analysis.model_used}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(analysis.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3">
                    {confirmDeleteId === analysis.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Confirm delete?</span>
                        <button
                          onClick={() => handleDelete(analysis.id)}
                          disabled={deletingId === analysis.id}
                          className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600 disabled:opacity-50"
                        >
                          {deletingId === analysis.id ? 'Deleting...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditItem(analysis)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-primary-50 hover:text-primary-600"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(analysis.id)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2 text-sm">
          <button className="btn-secondary px-3 py-1.5" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            className="btn-secondary px-3 py-1.5"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      ) : null}

      {showCreate ? <CreateModal onClose={() => setShowCreate(false)} onSave={handleCreate} /> : null}
      {editItem ? <EditModal item={editItem} onClose={() => setEditItem(null)} onSave={handleEdit} /> : null}
    </div>
  )
}
