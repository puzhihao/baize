import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { adminApi, type AdminResumeItem } from '../../services/adminApi'

const STATUS_OPTIONS = ['ready', 'pending', 'processing', 'failed']

const statusLabel: Record<string, string> = {
  ready: 'Ready',
  pending: 'Pending',
  processing: 'Processing',
  failed: 'Failed',
}

const statusColor: Record<string, string> = {
  ready: 'bg-green-100 text-green-700',
  pending: 'bg-gray-100 text-gray-600',
  processing: 'bg-blue-100 text-blue-700',
  failed: 'bg-red-100 text-red-600',
}

interface CreateForm {
  user_id: string
  title: string
  file_type: string
  status: string
}

interface EditForm {
  title: string
  status: string
}

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
    if (!form.user_id || !form.title) {
      setError('User ID and title are required')
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
          <h2 className="text-base font-semibold text-gray-900">Create resume</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="Enter user ID"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              className="input w-full"
              required
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Resume title"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">File type</label>
            <select
              className="input w-full"
              value={form.file_type}
              onChange={(e) => setForm((prev) => ({ ...prev, file_type: e.target.value }))}
            >
              {['text', 'pdf', 'docx'].map((type) => (
                <option key={type} value={type}>
                  {type.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
            <select
              className="input w-full"
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {statusLabel[status]}
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
          <h2 className="text-base font-semibold text-gray-900">Edit resume</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              className="input w-full"
              required
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
            <select
              className="input w-full"
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {statusLabel[status]}
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

export default function AdminResumes() {
  const [items, setItems] = useState<AdminResumeItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem] = useState<AdminResumeItem | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const pageSize = 20

  const load = () => {
    setLoading(true)
    adminApi
      .resumes(page, pageSize)
      .then(({ data }) => {
        setItems(data.items)
        setTotal(data.total)
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [page])

  const totalPages = Math.ceil(total / pageSize)

  const handleCreate = async (data: CreateForm) => {
    await adminApi.createResume({
      user_id: Number(data.user_id),
      title: data.title,
      file_type: data.file_type,
      status: data.status,
    })
    load()
  }

  const handleEdit = async (data: EditForm) => {
    if (!editItem) return
    await adminApi.updateResume(editItem.id, data)
    load()
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)

    try {
      await adminApi.deleteResume(id)
      setItems((prev) => prev.filter((resume) => resume.id !== id))
      setTotal((count) => count - 1)
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  return (
    <div className="space-y-5 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Resumes</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Total: {total}</span>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Create resume
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              {['ID', 'Title', 'User', 'Type', 'Status', 'Created', 'Actions'].map((header) => (
                <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No data
                </td>
              </tr>
            ) : (
              items.map((resume) => (
                <tr key={resume.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{resume.id}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-gray-900">{resume.title}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{resume.user_email}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium uppercase text-gray-500">{resume.file_type || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        statusColor[resume.status] ?? 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {statusLabel[resume.status] ?? resume.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(resume.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3">
                    {confirmDeleteId === resume.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Confirm delete?</span>
                        <button
                          onClick={() => handleDelete(resume.id)}
                          disabled={deletingId === resume.id}
                          className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600 disabled:opacity-50"
                        >
                          {deletingId === resume.id ? 'Deleting...' : 'Confirm'}
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
                          onClick={() => setEditItem(resume)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-primary-50 hover:text-primary-600"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(resume.id)}
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
