import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { adminApi } from '../../services/adminApi'

const DEFAULT_HINT = `Supported placeholders:
{{resume}}      Resume content, required
{{jd_section}}  JD analysis section, auto-filled when a JD is provided`

export default function AdminPrompt() {
  const [content, setContent] = useState('')
  const [original, setOriginal] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi
      .getPrompt()
      .then(({ data }) => {
        setContent(data.content)
        setOriginal(data.content)
        setUpdatedAt(data.updated_at)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!content.includes('{{resume}}')) {
      setError('Prompt must include {{resume}}')
      return
    }

    setSaving(true)
    setError('')
    setSaved(false)

    try {
      const { data } = await adminApi.updatePrompt(content)
      setOriginal(data.content)
      setUpdatedAt(data.updated_at)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setContent(original)
    setError('')
  }

  const isDirty = content !== original

  return (
    <div className="max-w-4xl space-y-5 p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Analysis Prompt</h1>
          <p className="mt-1 text-sm text-gray-400">
            One shared prompt is used for every AI analysis request.
            {updatedAt ? <span className="ml-2">Last saved: {new Date(updatedAt).toLocaleString('zh-CN')}</span> : null}
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          {isDirty ? (
            <button onClick={handleReset} className="btn-secondary flex items-center gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              Reset changes
            </button>
          ) : null}
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <pre className="whitespace-pre-wrap font-mono text-xs text-blue-700">{DEFAULT_HINT}</pre>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      ) : null}

      {loading ? (
        <div className="flex h-96 items-center justify-center text-sm text-gray-400">Loading...</div>
      ) : (
        <div className="card overflow-hidden">
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              setError('')
            }}
            className="h-[600px] w-full resize-none p-5 font-mono text-sm leading-relaxed text-gray-800 focus:outline-none"
            spellCheck={false}
            placeholder="Enter the prompt template here..."
          />
        </div>
      )}
    </div>
  )
}
