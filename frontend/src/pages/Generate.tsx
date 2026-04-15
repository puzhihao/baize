import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Wand2, RotateCcw, Save, Printer, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { resumeApi } from '../services/api'
import { useAuthStore } from '../store/auth'

interface GenerateForm {
  name: string
  phone: string
  email: string
  position: string
  education: string
  experience: string
  skills: string
  projects: string
  jdText: string
  model: string
  showJD: boolean
}

const MODELS = ['minimax', 'deepseek', 'openai', 'claude']

const TIPS = [
  { label: '姓名 / 联系方式', tip: '确保手机和邮箱真实有效，姓名建议使用真实全名。' },
  { label: '求职岗位', tip: '填写目标岗位名称，越精确越好，如"高级前端工程师"而非"程序员"。' },
  { label: '教育背景', tip: '格式建议：学校名称 / 专业 / 学历 / 入学-毕业年份，按时间倒序。' },
  { label: '工作经历', tip: '按时间倒序，每段写清楚：公司名 / 职位 / 时间段 / 主要职责和成果（尽量量化）。' },
  { label: '技能特长', tip: '列出编程语言、框架、工具、证书等，与目标岗位匹配度高的放前面。' },
  { label: '项目经历', tip: '可选。写出项目名称、你的角色、技术栈、核心贡献（最好有数字成果）。' },
]

export default function GeneratePage() {
  const navigate = useNavigate()
  const { accessToken } = useAuthStore()
  const printRef = useRef<HTMLDivElement>(null)

  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState<GenerateForm>({
    name: '', phone: '', email: '', position: '',
    education: '', experience: '', skills: '', projects: '',
    jdText: '', model: 'minimax', showJD: false,
  })
  const [generatedText, setGeneratedText] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamError, setStreamError] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const set = (key: keyof GenerateForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleGenerate = async () => {
    if (!form.name.trim()) { setFormError('请填写姓名'); return }
    if (!form.position.trim()) { setFormError('请填写求职岗位'); return }
    setFormError('')
    setStep(2)
    setGeneratedText('')
    setStreamError('')
    setStreaming(true)

    try {
      const apiBase = import.meta.env.VITE_API_URL || '/api'
      const res = await fetch(`${apiBase}/resumes/generate-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          position: form.position,
          education: form.education,
          experience: form.experience,
          skills: form.skills,
          projects: form.projects,
          jd_text: form.jdText,
          model: form.model,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '生成失败' }))
        setStreamError(err.error || '生成失败')
        setStreaming(false)
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()!
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const token = line.slice(5)
            setGeneratedText(prev => prev + token)
          } else if (line.startsWith('event:done') || line.startsWith('event: done')) {
            // done
          }
        }
      }
    } catch (e: any) {
      setStreamError(e.message || '生成失败，请重试')
    } finally {
      setStreaming(false)
    }
  }

  const handleRegenerate = () => {
    setGeneratedText('')
    setStreamError('')
    handleGenerate()
  }

  const handleSave = async () => {
    if (!generatedText.trim()) return
    setSaving(true)
    try {
      const { data } = await resumeApi.createFromText(`${form.position}简历`, generatedText)
      navigate(`/resume/${data.id}`)
    } catch (e: any) {
      setStreamError(e.response?.data?.error || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => window.print()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #resume-print-area, #resume-print-area * { visibility: visible; }
          #resume-print-area {
            position: absolute; inset: 0;
            padding: 2cm; font-family: "Noto Serif SC", serif;
            font-size: 11pt; line-height: 1.6; white-space: pre-wrap;
            color: #000;
          }
        }
      `}</style>

      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
        <Link to="/dashboard" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
            <Wand2 className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-gray-900">AI 写简历</span>
        </div>
        {step === 2 && (
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => { setStep(1); setGeneratedText('') }}
              className="btn-secondary flex items-center gap-1.5 text-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> 返回修改
            </button>
            {!streaming && generatedText && (
              <>
                <button
                  onClick={handleRegenerate}
                  className="btn-secondary flex items-center gap-1.5 text-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> 重新生成
                </button>
                <button
                  onClick={handlePrint}
                  className="btn-secondary flex items-center gap-1.5 text-sm"
                >
                  <Printer className="w-3.5 h-3.5" /> 下载 PDF
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  保存为简历
                </button>
              </>
            )}
          </div>
        )}
      </header>

      {/* Step 1 — Form */}
      {step === 1 && (
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-5 gap-8">
          {/* Left: form */}
          <div className="col-span-3 space-y-5">
            {formError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                {formError}
              </div>
            )}

            <div className="card p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">基本信息</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">姓名 <span className="text-red-500">*</span></label>
                  <input className="input" placeholder="张三" value={form.name} onChange={set('name')} />
                </div>
                <div>
                  <label className="label">求职岗位 <span className="text-red-500">*</span></label>
                  <input className="input" placeholder="高级前端工程师" value={form.position} onChange={set('position')} />
                </div>
                <div>
                  <label className="label">手机号</label>
                  <input className="input" placeholder="138xxxx0000" value={form.phone} onChange={set('phone')} />
                </div>
                <div>
                  <label className="label">邮箱</label>
                  <input className="input" placeholder="example@email.com" value={form.email} onChange={set('email')} />
                </div>
              </div>
            </div>

            <div className="card p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">经历信息</h2>
              <div>
                <label className="label">教育背景</label>
                <textarea className="input h-24 resize-none" placeholder="例：北京大学 / 计算机科学与技术 / 本科 / 2018-2022" value={form.education} onChange={set('education')} />
              </div>
              <div>
                <label className="label">工作经历</label>
                <textarea className="input h-40 resize-none" placeholder="例：字节跳动 / 高级前端工程师 / 2022.07-至今&#10;- 负责 xxx 平台前端架构设计..." value={form.experience} onChange={set('experience')} />
              </div>
              <div>
                <label className="label">技能特长</label>
                <textarea className="input h-24 resize-none" placeholder="例：React / TypeScript / Node.js / MySQL..." value={form.skills} onChange={set('skills')} />
              </div>
              <div>
                <label className="label">项目经历 <span className="text-gray-400 text-xs">可选</span></label>
                <textarea className="input h-32 resize-none" placeholder="例：白泽简历系统 / 前端负责人 / React + Go..." value={form.projects} onChange={set('projects')} />
              </div>
            </div>

            {/* JD (collapsible) */}
            <div className="card overflow-hidden">
              <button
                onClick={() => setForm(prev => ({ ...prev, showJD: !prev.showJD }))}
                className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span>目标 JD（可选，填写后匹配效果更好）</span>
                {form.showJD ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {form.showJD && (
                <div className="px-5 pb-5">
                  <textarea
                    className="input h-40 resize-none"
                    placeholder="粘贴招聘 JD 内容..."
                    value={form.jdText}
                    onChange={set('jdText')}
                  />
                </div>
              )}
            </div>

            <div className="card p-5 flex items-center justify-between">
              <div>
                <label className="label mb-1">AI 模型</label>
                <select className="input w-40" value={form.model} onChange={set('model')}>
                  {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <button onClick={handleGenerate} className="btn-primary flex items-center gap-2">
                <Wand2 className="w-4 h-4" /> 开始生成
              </button>
            </div>
          </div>

          {/* Right: tips */}
          <div className="col-span-2 space-y-3">
            <div className="sticky top-6">
              <h3 className="text-sm font-medium text-gray-500 mb-3">填写提示</h3>
              <div className="space-y-2">
                {TIPS.map(t => (
                  <div key={t.label} className="card p-4">
                    <p className="text-xs font-medium text-gray-700 mb-1">{t.label}</p>
                    <p className="text-xs text-gray-400 leading-relaxed">{t.tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2 — Result */}
      {step === 2 && (
        <div className="max-w-4xl mx-auto px-6 py-8">
          {streamError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              {streamError}
            </div>
          )}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">生成结果</span>
                {streaming && (
                  <span className="flex items-center gap-1.5 text-xs text-primary-600">
                    <Loader2 className="w-3 h-3 animate-spin" /> 生成中...
                  </span>
                )}
                {!streaming && generatedText && (
                  <span className="text-xs text-green-600">生成完成，可直接编辑</span>
                )}
              </div>
              {!streaming && generatedText && (
                <div className="flex items-center gap-2">
                  <button onClick={handleRegenerate} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> 重新生成
                  </button>
                </div>
              )}
            </div>
            {/* Printable area */}
            <div id="resume-print-area" ref={printRef}>
              <textarea
                className="w-full p-5 font-mono text-sm text-gray-800 resize-none focus:outline-none leading-relaxed bg-white"
                style={{ minHeight: '70vh' }}
                value={generatedText}
                onChange={e => setGeneratedText(e.target.value)}
                disabled={streaming}
                placeholder={streaming ? '' : '等待生成...'}
              />
            </div>
          </div>

          {!streaming && generatedText && (
            <div className="mt-4 flex items-center justify-end gap-3">
              <button onClick={handlePrint} className="btn-secondary flex items-center gap-1.5">
                <Printer className="w-4 h-4" /> 下载 PDF
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-1.5 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                保存为简历
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
