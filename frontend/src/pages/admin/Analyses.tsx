import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
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
  resume_id: '', user_id: '', total_score: '0', jd_match_score: '0', model_used: 'minimax',
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
    setSaving(true); setError('')
    try { await onSave(form); onClose() }
    catch (err: any) { setError(err?.response?.data?.error || '操作失败') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">新增分析记录</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">简历 ID <span className="text-red-500">*</span></label>
              <input className="input w-full" type="number" min="1" required value={form.resume_id}
                onChange={e => setForm(f => ({ ...f, resume_id: e.target.value }))} placeholder="简历 ID" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">用户 ID <span className="text-red-500">*</span></label>
              <input className="input w-full" type="number" min="1" required value={form.user_id}
                onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))} placeholder="用户 ID" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">综合评分</label>
              <input className="input w-full" type="number" min="0" max="100" value={form.total_score}
                onChange={e => setForm(f => ({ ...f, total_score: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">JD 匹配分</label>
              <input className="input w-full" type="number" min="0" max="100" value={form.jd_match_score}
                onChange={e => setForm(f => ({ ...f, jd_match_score: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">使用模型</label>
            <select className="input w-full" value={form.model_used}
              onChange={e => setForm(f => ({ ...f, model_used: e.target.value }))}>
              {MODEL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">取消</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? '保存中...' : '保存'}</button>
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
    setSaving(true); setError('')
    try {
      await onSave({ total_score: Number(totalScore), jd_match_score: Number(jdScore), model_used: modelUsed })
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error || '操作失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">编辑分析记录</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-gray-400 mb-4">简历：{item.resume_title || `#${item.resume_id}`} · 用户：{item.user_email}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">综合评分</label>
              <input className="input w-full" type="number" min="0" max="100"
                value={totalScore} onChange={e => setTotalScore(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">JD 匹配分</label>
              <input className="input w-full" type="number" min="0" max="100"
                value={jdScore} onChange={e => setJdScore(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">使用模型</label>
            <select className="input w-full" value={modelUsed} onChange={e => setModelUsed(e.target.value)}>
              {MODEL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">取消</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? '保存中...' : '保存'}</button>
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
  const pageSize = 20

  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem] = useState<AdminAnalysisItem | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    adminApi.analyses(page, pageSize)
      .then(({ data }) => { setItems(data.items); setTotal(data.total) })
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
    await adminApi.updateAnalysis(editItem!.id, data)
    load()
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await adminApi.deleteAnalysis(id)
      setItems(prev => prev.filter(a => a.id !== id))
      setTotal(t => t - 1)
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  return (
    <div className="p-8 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">分析记录</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">共 {total} 条记录</span>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />新增记录
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['ID', '简历', '用户', '综合评分', 'JD 匹配', '模型', '时间', '操作'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">暂无数据</td></tr>
            ) : items.map(a => (
              <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-400">{a.id}</td>
                <td className="px-4 py-3 text-gray-900 max-w-[160px] truncate">{a.resume_title || '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{a.user_email}</td>
                <td className="px-4 py-3"><ScoreBadge score={a.total_score} /></td>
                <td className="px-4 py-3 text-gray-500">
                  {a.jd_match_score > 0 ? <ScoreBadge score={a.jd_match_score} /> : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${MODEL_COLOR[a.model_used] ?? 'bg-gray-100 text-gray-600'}`}>
                    {a.model_used}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(a.created_at).toLocaleDateString('zh-CN')}
                </td>
                <td className="px-4 py-3">
                  {confirmDeleteId === a.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">确认删除？</span>
                      <button onClick={() => handleDelete(a.id)} disabled={deletingId === a.id}
                        className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50">
                        {deletingId === a.id ? '删除中' : '确认'}
                      </button>
                      <button onClick={() => setConfirmDeleteId(null)}
                        className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200">
                        取消
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditItem(a)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors" title="编辑">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setConfirmDeleteId(a.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="删除">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-end text-sm">
          <button className="btn-secondary py-1.5 px-3" disabled={page === 1} onClick={() => setPage(p => p - 1)}>上一页</button>
          <span className="text-gray-500">{page} / {totalPages}</span>
          <button className="btn-secondary py-1.5 px-3" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>下一页</button>
        </div>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onSave={handleCreate} />}
      {editItem && <EditModal item={editItem} onClose={() => setEditItem(null)} onSave={handleEdit} />}
    </div>
  )
}
