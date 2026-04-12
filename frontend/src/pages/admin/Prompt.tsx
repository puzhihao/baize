import { useEffect, useRef, useState } from 'react'
import { adminApi } from '../../services/adminApi'
import { RotateCcw } from 'lucide-react'

const DEFAULT_HINT = `支持以下占位符：
  {{resume}}      — 简历正文（必须保留）
  {{jd_section}}  — JD 分析段落（有 JD 时自动填充，无 JD 时为空）`

export default function AdminPrompt() {
  const [content, setContent] = useState('')
  const [original, setOriginal] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    adminApi.getPrompt()
      .then(({ data }) => {
        setContent(data.content)
        setOriginal(data.content)
        setUpdatedAt(data.updated_at)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!content.includes('{{resume}}')) {
      setError('Prompt 必须包含 {{resume}} 占位符')
      return
    }
    setSaving(true); setError(''); setSaved(false)
    try {
      const { data } = await adminApi.updatePrompt(content)
      setOriginal(data.content)
      setUpdatedAt(data.updated_at)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      setError(err?.response?.data?.error || '保存失败')
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
    <div className="p-8 space-y-5 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">分析 Prompt</h1>
          <p className="text-sm text-gray-400 mt-1">
            全局唯一 Prompt，所有 AI 模型分析简历时均使用此配置。
            {updatedAt && <span className="ml-2">上次保存：{new Date(updatedAt).toLocaleString('zh-CN')}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isDirty && (
            <button onClick={handleReset} className="btn-secondary flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />撤销修改
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '保存中...' : saved ? '已保存 ✓' : '保存'}
          </button>
        </div>
      </div>

      {/* 占位符提示 */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <pre className="text-xs text-blue-700 whitespace-pre-wrap font-mono">{DEFAULT_HINT}</pre>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-96 flex items-center justify-center text-gray-400 text-sm">加载中...</div>
      ) : (
        <div className="card overflow-hidden">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => { setContent(e.target.value); setError('') }}
            className="w-full h-[600px] p-5 font-mono text-sm text-gray-800 resize-none focus:outline-none leading-relaxed"
            spellCheck={false}
            placeholder="在此输入 Prompt 模板..."
          />
        </div>
      )}
    </div>
  )
}
