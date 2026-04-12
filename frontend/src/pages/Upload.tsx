import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText, Type, LayoutGrid, Loader2, X } from 'lucide-react'
import { resumeApi } from '../services/api'

type UploadMode = 'file' | 'text' | 'form'

export default function UploadPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<UploadMode>('file')
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.pdf') || f.name.endsWith('.docx'))) {
      setFile(f)
      if (!title) setTitle(f.name.replace(/\.(pdf|docx)$/i, ''))
    } else {
      setError('仅支持 PDF 和 DOCX 格式')
    }
  }, [title])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      if (!title) setTitle(f.name.replace(/\.(pdf|docx)$/i, ''))
    }
  }

  const handleSubmit = async () => {
    setError('')
    if (mode === 'file' && !file) { setError('请选择文件'); return }
    if ((mode === 'text' || mode === 'form') && !text.trim()) { setError('请输入简历内容'); return }
    if (!title.trim()) { setError('请输入简历标题'); return }
    setLoading(true)
    try {
      let resume
      if (mode === 'file' && file) {
        const { data } = await resumeApi.upload(file)
        resume = data
      } else {
        const { data } = await resumeApi.createFromText(title, text)
        resume = data
      }
      navigate(`/resume/${resume.id}`)
    } catch (e: any) {
      setError(e.response?.data?.error || '上传失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const tabs: { id: UploadMode; label: string; icon: React.ReactNode }[] = [
    { id: 'file', label: '上传文件', icon: <Upload className="w-4 h-4" /> },
    { id: 'text', label: '粘贴文本', icon: <Type className="w-4 h-4" /> },
    { id: 'form', label: '填写表单', icon: <LayoutGrid className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">上传简历</h1>
          <p className="text-gray-500 text-sm mt-1">选择上传方式，开始 AI 分析优化</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white border border-gray-100 p-1 rounded-xl w-fit">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setMode(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === t.id
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <div className="card p-8">
          {/* Title input */}
          <div className="mb-6">
            <label className="label">简历标题</label>
            <input className="input" placeholder="例：2026届前端工程师简历" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          {/* File upload mode */}
          {mode === 'file' && (
            <div
              onDrop={onDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
                dragOver ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
              }`}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input id="file-input" type="file" accept=".pdf,.docx" className="hidden" onChange={onFileChange} />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setFile(null) }}
                    className="ml-2 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-7 h-7 text-primary-400" />
                  </div>
                  <p className="font-medium text-gray-700 mb-1">拖放文件到此处，或点击选择</p>
                  <p className="text-sm text-gray-400">支持 PDF、DOCX 格式，最大 10MB</p>
                </>
              )}
            </div>
          )}

          {/* Text mode */}
          {mode === 'text' && (
            <div>
              <label className="label">简历内容</label>
              <textarea
                className="input h-64 resize-none"
                placeholder="将简历内容粘贴到此处..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">{text.length} 字符</p>
            </div>
          )}

          {/* Form mode */}
          {mode === 'form' && (
            <FormMode onChange={setText} />
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button onClick={() => navigate('/dashboard')} className="btn-secondary">取消</button>
            <button onClick={handleSubmit} className="btn-primary flex-1 justify-center" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? '上传中...' : '上传并分析'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FormMode({ onChange }: { onChange: (v: string) => void }) {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', position: '',
    education: '', experience: '', skills: '', projects: '',
  })

  const update = (k: keyof typeof form, v: string) => {
    const next = { ...form, [k]: v }
    setForm(next)
    // Convert form to text
    const parts = [
      next.name && `姓名：${next.name}`,
      next.phone && `电话：${next.phone}`,
      next.email && `邮箱：${next.email}`,
      next.position && `求职意向：${next.position}`,
      next.education && `\n教育经历：\n${next.education}`,
      next.experience && `\n工作经历：\n${next.experience}`,
      next.skills && `\n技能：\n${next.skills}`,
      next.projects && `\n项目经历：\n${next.projects}`,
    ].filter(Boolean)
    onChange(parts.join('\n'))
  }

  const fields = [
    { key: 'name', label: '姓名', placeholder: '张三', multiline: false },
    { key: 'phone', label: '联系电话', placeholder: '138xxxx1234', multiline: false },
    { key: 'email', label: '邮箱', placeholder: 'zhang@example.com', multiline: false },
    { key: 'position', label: '求职意向', placeholder: '前端工程师 / 产品经理...', multiline: false },
    { key: 'education', label: '教育经历', placeholder: '2022-2026 XX大学 计算机科学 本科...', multiline: true },
    { key: 'experience', label: '工作经历', placeholder: '2024.07-至今 XX公司 前端开发工程师\n- 负责...', multiline: true },
    { key: 'skills', label: '技能', placeholder: 'React / Vue / TypeScript / Node.js...', multiline: true },
    { key: 'projects', label: '项目经历', placeholder: '项目名称、时间、角色、技术栈、成果...', multiline: true },
  ] as const

  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="label">{f.label}</label>
          {f.multiline ? (
            <textarea className="input h-24 resize-none" placeholder={f.placeholder}
              value={form[f.key]} onChange={(e) => update(f.key, e.target.value)} />
          ) : (
            <input className="input" placeholder={f.placeholder}
              value={form[f.key]} onChange={(e) => update(f.key, e.target.value)} />
          )}
        </div>
      ))}
    </div>
  )
}
