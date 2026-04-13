import { useEffect, useState } from 'react'
import { Ban, CircleCheck, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { adminApi, type AdminUserItem } from '../../services/adminApi'

interface UserFormData {
  email: string
  password: string
  nickname: string
  tier: string
  is_admin: boolean
  is_disabled: boolean
}

const defaultForm: UserFormData = {
  email: '',
  password: '',
  nickname: '',
  tier: 'free',
  is_admin: false,
  is_disabled: false,
}

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
    if (mode === 'create' && !form.password) {
      setError('Password is required')
      return
    }

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
          <h2 className="text-base font-semibold text-gray-900">
            {mode === 'create' ? 'Create user' : 'Edit user'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'create' ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                className="input w-full"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="user@example.com"
              />
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Password
              {mode === 'edit' ? (
                <span className="ml-1 font-normal text-gray-400">(leave blank to keep current password)</span>
              ) : (
                <span className="text-red-500"> *</span>
              )}
            </label>
            <input
              className="input w-full"
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder={mode === 'edit' ? 'Leave blank to keep unchanged' : 'At least 6 characters'}
              minLength={form.password ? 6 : undefined}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nickname</label>
            <input
              className="input w-full"
              value={form.nickname}
              onChange={(e) => setForm((prev) => ({ ...prev, nickname: e.target.value }))}
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Plan</label>
            <select
              className="input w-full"
              value={form.tier}
              onChange={(e) => setForm((prev) => ({ ...prev, tier: e.target.value }))}
            >
              <option value="free">Free</option>
              <option value="pro">Pro</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="is_admin"
              type="checkbox"
              checked={form.is_admin}
              onChange={(e) => setForm((prev) => ({ ...prev, is_admin: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-primary-600"
            />
            <label htmlFor="is_admin" className="text-sm text-gray-700">
              Admin privileges
            </label>
          </div>

          {mode === 'edit' ? (
            <div className="flex items-center gap-2">
              <input
                id="is_disabled"
                type="checkbox"
                checked={form.is_disabled}
                onChange={(e) => setForm((prev) => ({ ...prev, is_disabled: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-red-500"
              />
              <label htmlFor="is_disabled" className="text-sm text-gray-700">
                Disable account
              </label>
            </div>
          ) : null}

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

export default function AdminUsers() {
  const [items, setItems] = useState<AdminUserItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [inputQ, setInputQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; item?: AdminUserItem } | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const pageSize = 20

  const load = () => {
    setLoading(true)
    adminApi
      .users(page, pageSize, q)
      .then(({ data }) => {
        setItems(data.items)
        setTotal(data.total)
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [page, q])

  const totalPages = Math.ceil(total / pageSize)

  const handleSave = async (data: UserFormData) => {
    if (modal?.mode === 'create') {
      await adminApi.createUser({
        email: data.email,
        password: data.password,
        nickname: data.nickname,
        tier: data.tier,
        is_admin: data.is_admin,
      })
    } else if (modal?.item) {
      const payload: {
        nickname: string
        tier: string
        is_admin: boolean
        is_disabled: boolean
        password?: string
      } = {
        nickname: data.nickname,
        tier: data.tier,
        is_admin: data.is_admin,
        is_disabled: data.is_disabled,
      }

      if (data.password) {
        payload.password = data.password
      }

      await adminApi.updateUser(modal.item.id, payload)
    }

    load()
  }

  const handleToggleDisabled = async (user: AdminUserItem) => {
    setTogglingId(user.id)

    try {
      await adminApi.updateUser(user.id, {
        nickname: user.nickname,
        tier: user.tier,
        is_admin: user.is_admin,
        is_disabled: !user.is_disabled,
      })

      setItems((prev) =>
        prev.map((item) => (item.id === user.id ? { ...item, is_disabled: !user.is_disabled } : item)),
      )
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)

    try {
      await adminApi.deleteUser(id)
      setItems((prev) => prev.filter((user) => user.id !== id))
      setTotal((count) => count - 1)
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  return (
    <div className="space-y-5 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Users</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Total: {total}</span>
          <button className="btn-primary" onClick={() => setModal({ mode: 'create' })}>
            <Plus className="h-4 w-4" />
            Create user
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="input w-full pl-9"
            placeholder="Search by email or nickname"
            value={inputQ}
            onChange={(e) => setInputQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setQ(inputQ)
                setPage(1)
              }
            }}
          />
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setQ(inputQ)
            setPage(1)
          }}
        >
          Search
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              {['ID', 'Email', 'Nickname', 'Plan', 'Status', 'Analyses', 'Created', 'Role', 'Actions'].map(
                (header) => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    {header}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  No data
                </td>
              </tr>
            ) : (
              items.map((user) => (
                <tr
                  key={user.id}
                  className={`transition-colors hover:bg-gray-50 ${user.is_disabled ? 'opacity-60' : ''}`}
                >
                  <td className="px-4 py-3 text-gray-400">{user.id}</td>
                  <td className="px-4 py-3 text-gray-900">{user.email}</td>
                  <td className="px-4 py-3 text-gray-600">{user.nickname || '-'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.tier === 'pro' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {user.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.is_disabled ? (
                      <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                        Disabled
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.analysis_used}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(user.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3">
                    {user.is_admin ? (
                      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Admin
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {confirmDeleteId === user.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Confirm delete?</span>
                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={deletingId === user.id}
                          className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600 disabled:opacity-50"
                        >
                          {deletingId === user.id ? 'Deleting...' : 'Confirm'}
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
                          onClick={() => setModal({ mode: 'edit', item: user })}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-primary-50 hover:text-primary-600"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleDisabled(user)}
                          disabled={togglingId === user.id}
                          className={`rounded-lg p-1.5 transition-colors disabled:opacity-50 ${
                            user.is_disabled
                              ? 'text-gray-400 hover:bg-green-50 hover:text-green-600'
                              : 'text-gray-400 hover:bg-orange-50 hover:text-orange-500'
                          }`}
                          title={user.is_disabled ? 'Enable account' : 'Disable account'}
                        >
                          {user.is_disabled ? <CircleCheck className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(user.id)}
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

      {modal ? (
        <UserModal
          mode={modal.mode}
          initial={
            modal.item
              ? {
                  email: modal.item.email,
                  password: '',
                  nickname: modal.item.nickname,
                  tier: modal.item.tier,
                  is_admin: modal.item.is_admin,
                  is_disabled: modal.item.is_disabled,
                }
              : defaultForm
          }
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      ) : null}
    </div>
  )
}
