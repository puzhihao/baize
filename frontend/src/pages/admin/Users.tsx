import { useEffect, useState } from 'react'
import { Search, Plus, Pencil, Trash2, X, Ban, CircleCheck } from 'lucide-react'
import { adminApi, type AdminUserItem } from '../../services/adminApi'

interface UserFormData {
  email: string
  password: string
  nickname: string
  tier: string
  is_admin: boolean
  is_disabled: boolean
}

const defaultForm: UserFormData = { email: '', password: '', nickname: '', tier: 'free', is_admin: false, is_disabled: false }

interface ModalProps {
  mode: 'create' | 'edit'
  initial: UserFormData
  onClose: () => void
  onSave: (data: UserFormData) => Promise<void>
}

function UserModal({ mode, initial, onClose, onSave }: ModalProps) {
  const [form, setForm] = useState<UserFormData>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'create' && !form.password) { setError('请输入密码'); return }
    setSaving(true)
    setError('')
    try {
      await onSave(form)
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error || '操作失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">{mode === 'create' ? '新增用户' : '编辑用户'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'create' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱 <span className="text-red-500">*</span></label>
              <input className="input w-full" type="email" required value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@example.com" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              密码{mode === 'edit' ? <span className="text-gray-400 font-normal ml-1">（留空则不修改）</span> : <span className="text-red-500"> *</span>}
            </label>
            <input className="input w-full" type="password" value={form.password}
              onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder={mode === 'edit' ? '不修改请留空' : '至少 6 位'}
              minLength={form.password ? 6 : undefined} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">昵称</label>
            <input className="input w-full" value={form.nickname}
              onChange={(e) => setForm(f => ({ ...f, nickname: e.target.value }))} placeholder="可选" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">套餐</label>
            <select className="input w-full" value={form.tier}
              onChange={(e) => setForm(f => ({ ...f, tier: e.target.value }))}>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input id="is_admin" type="checkbox" checked={form.is_admin}
              onChange={(e) => setForm(f => ({ ...f, is_admin: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-primary-600" />
            <label htmlFor="is_admin" className="text-sm text-gray-700">管理员权限</label>
          </div>
          {mode === 'edit' && (
            <div className="flex items-center gap-2">
              <input id="is_disabled" type="checkbox" checked={form.is_disabled}
                onChange={(e) => setForm(f => ({ ...f, is_disabled: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-red-500" />
              <label htmlFor="is_disabled" className="text-sm text-gray-700">禁用账号</label>
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">取消</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminUsers() {
  const [items, setItems] = useState<AdminUserItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [inputQ, setInputQ] = useState('')
  const [loading, setLoading] = useState(true)
  const pageSize = 20

  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; item?: AdminUserItem } | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    adminApi.users(page, pageSize, q)
      .then(({ data }) => { setItems(data.items); setTotal(data.total) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [page, q])

  const totalPages = Math.ceil(total / pageSize)

  const handleSave = async (data: UserFormData) => {
    if (modal?.mode === 'create') {
      await adminApi.createUser({ email: data.email, password: data.password, nickname: data.nickname, tier: data.tier, is_admin: data.is_admin })
    } else if (modal?.item) {
      const payload: { nickname: string; tier: string; is_admin: boolean; is_disabled: boolean; password?: string } = {
        nickname: data.nickname, tier: data.tier, is_admin: data.is_admin, is_disabled: data.is_disabled,
      }
      if (data.password) payload.password = data.password
      await adminApi.updateUser(modal.item.id, payload)
    }
    load()
  }

  const handleToggleDisabled = async (u: AdminUserItem) => {
    setTogglingId(u.id)
    try {
      await adminApi.updateUser(u.id, {
        nickname: u.nickname,
        tier: u.tier,
        is_admin: u.is_admin,
        is_disabled: !u.is_disabled,
      })
      setItems(prev => prev.map(item => item.id === u.id ? { ...item, is_disabled: !u.is_disabled } : item))
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await adminApi.deleteUser(id)
      setItems(prev => prev.filter(u => u.id !== id))
      setTotal(t => t - 1)
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  return (
    <div className="p-8 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">用户管理</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">共 {total} 位用户</span>
          <button className="btn-primary" onClick={() => setModal({ mode: 'create' })}>
            <Plus className="w-4 h-4" />新增用户
          </button>
        </div>
      </div>

      {/* 搜索 */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9 w-full"
            placeholder="搜索邮箱或昵称"
            value={inputQ}
            onChange={(e) => setInputQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setQ(inputQ); setPage(1) } }}
          />
        </div>
        <button className="btn-primary" onClick={() => { setQ(inputQ); setPage(1) }}>搜索</button>
      </div>

      {/* 表格 */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['ID', '邮箱', '昵称', '套餐', '状态', '分析次数', '注册时间', '角色', '操作'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">暂无数据</td></tr>
            ) : items.map((u) => (
              <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${u.is_disabled ? 'opacity-60' : ''}`}>
                <td className="px-4 py-3 text-gray-400">{u.id}</td>
                <td className="px-4 py-3 text-gray-900">{u.email}</td>
                <td className="px-4 py-3 text-gray-600">{u.nickname || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium
                    ${u.tier === 'pro' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'}`}>
                    {u.tier}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.is_disabled ? (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">禁用</span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">正常</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{u.analysis_used}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(u.created_at).toLocaleDateString('zh-CN')}
                </td>
                <td className="px-4 py-3">
                  {u.is_admin && (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      管理员
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {confirmDeleteId === u.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">确认删除？</span>
                      <button
                        onClick={() => handleDelete(u.id)}
                        disabled={deletingId === u.id}
                        className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        {deletingId === u.id ? '删除中' : '确认'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setModal({ mode: 'edit', item: u })}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        title="编辑"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleDisabled(u)}
                        disabled={togglingId === u.id}
                        className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                          u.is_disabled
                            ? 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                            : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'
                        }`}
                        title={u.is_disabled ? '解除禁用' : '禁用用户'}
                      >
                        {u.is_disabled ? <CircleCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(u.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="删除"
                      >
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

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-end text-sm">
          <button className="btn-secondary py-1.5 px-3" disabled={page === 1}
            onClick={() => setPage(p => p - 1)}>上一页</button>
          <span className="text-gray-500">{page} / {totalPages}</span>
          <button className="btn-secondary py-1.5 px-3" disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}>下一页</button>
        </div>
      )}

      {/* 新增/编辑弹窗 */}
      {modal && (
        <UserModal
          mode={modal.mode}
          initial={modal.item ? {
            email: modal.item.email,
            password: '',
            nickname: modal.item.nickname,
            tier: modal.item.tier,
            is_admin: modal.item.is_admin,
            is_disabled: modal.item.is_disabled,
          } : defaultForm}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
