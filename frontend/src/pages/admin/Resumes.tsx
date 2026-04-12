import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { adminApi, type AdminResumeItem } from '../../services/adminApi'

const STATUS_OPTIONS = ['ready', 'pending', 'processing', 'failed']
const statusLabel: Record<string, string> = {
  ready: '就绪', pending: '待处理', processing: '处理中', failed: '失败',
}
const statusColor: Record<string, string> = {
  ready: 'bg-green-100 text-green-700',
  pending: 'bg-gray-100 text-gray-600',
  processing: 'bg-blue-100 text-blue-700',
  failed: 'bg-red-100 text-red-600',
}

interface CreateForm { user_id: string; title: string; file_type: string; status: string }
interface EditForm { title: string; status: string }

const defaultCreate: CreateForm = { user_id: '', title: '', file_type: 'text', status: 'ready' }

interface CreateModalProps {
  onClose: () => void
  onSave: (data: CreateForm) => Promise<void>
}

function CreateModal({ onClose, onSave }: CreateModalProps) {
  const [form, setForm] = useState<CreateForm>(defaultCreate)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.user_id || !form.title) { setError('用户ID和标题为必填项'); return }
    setSaving(true); setError('')
    try { await onSave(form); onClose() }
    catch (err: any) { setError(err?.response?.data?.error || '操作失败') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">新增简历</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户 ID <span className="text-red-500">*</span></label>
            <input className="input w-full" type="number" min="1" required value={form.user_id}
              onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))} placeholder="输入用户 ID" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标题 <span className="text-red-500">*</span></label>
            <input className="input w-full" required value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="简历标题" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">文件类型</label>
            <select className="input w-full" value={form.file_type}
              onChange={e => setForm(f => ({ ...f, file_type: e.target.value }))}>
              {['text', 'pdf', 'docx'].map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select className="input w-full" value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
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
  item: AdminResumeItem
  onClose: () => void
  onSave: (data: EditForm) => Promise<void>
}

function EditModal({ item, onClose, onSave }: EditModalProps) {
  const [form, setForm] = useState<EditForm>({ title: item.title, status: item.status })
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
          <h2 className="text-base font-semibold text-gray-900">编辑简历</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标题 <span className="text-red-500">*</span></label>
            <input className="input w-full" required value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select className="input w-full" value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
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

export default function AdminResumes() {
  const [items, setItems] = useState<AdminResumeItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const pageSize = 20

  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem] = useState<AdminResumeItem | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    adminApi.resumes(page, pageSize)
      .then(({ data }) => { setItems(data.items); setTotal(data.total) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [page])

  const totalPages = Math.ceil(total / pageSize)

  const handleCreate = async (data: CreateForm) => {
    await adminApi.createResume({ user_id: Number(data.user_id), title: data.title, file_type: data.file_type, status: data.status })
    load()
  }

  const handleEdit = async (data: EditForm) => {
    await adminApi.updateResume(editItem!.id, data)
    load()
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await adminApi.deleteResume(id)
      setItems(prev => prev.filter(r => r.id !== id))
      setTotal(t => t - 1)
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  return (
    <div className="p-8 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">简历管理</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">共 {total} 份简历</span>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />新增简历
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['ID', '标题', '用户', '类型', '状态', '创建时间', '操作'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">暂无数据</td></tr>
            ) : items.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-400">{r.id}</td>
                <td className="px-4 py-3 text-gray-900 max-w-[200px] truncate">{r.title}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{r.user_email}</td>
                <td className="px-4 py-3">
                  <span className="uppercase text-xs font-medium text-gray-500">{r.file_type || '—'}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[r.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {statusLabel[r.status] ?? r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(r.created_at).toLocaleDateString('zh-CN')}
                </td>
                <td className="px-4 py-3">
                  {confirmDeleteId === r.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">确认删除？</span>
                      <button onClick={() => handleDelete(r.id)} disabled={deletingId === r.id}
                        className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50">
                        {deletingId === r.id ? '删除中' : '确认'}
                      </button>
                      <button onClick={() => setConfirmDeleteId(null)}
                        className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200">
                        取消
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditItem(r)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors" title="编辑">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setConfirmDeleteId(r.id)}
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
