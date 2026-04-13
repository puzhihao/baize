import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, LayoutGrid, Loader2, Type, Upload, X } from 'lucide-react'
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

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const nextFile = e.dataTransfer.files[0]
      if (nextFile && (nextFile.name.endsWith('.pdf') || nextFile.name.endsWith('.docx'))) {
        setFile(nextFile)
        if (!title) setTitle(nextFile.name.replace(/\.(pdf|docx)$/i, ''))
      } else {
        setError('Only PDF and DOCX files are supported')
      }
    },
    [title],
  )

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = e.target.files?.[0]
    if (!nextFile) return
    setFile(nextFile)
    if (!title) setTitle(nextFile.name.replace(/\.(pdf|docx)$/i, ''))
  }

  const handleSubmit = async () => {
    setError('')
    if (mode === 'file' && !file) {
      setError('Please select a file')
      return
    }
    if ((mode === 'text' || mode === 'form') && !text.trim()) {
      setError('Please enter resume content')
      return
    }
    if (!title.trim()) {
      setError('Please enter a resume title')
      return
    }

    setLoading(true)
    try {
      const resume =
        mode === 'file' && file
          ? (await resumeApi.upload(file)).data
          : (await resumeApi.createFromText(title, text)).data
      navigate(`/resume/${resume.id}`)
    } catch (e: any) {
      setError(e.response?.data?.error || 'Upload failed, please try again')
    } finally {
      setLoading(false)
    }
  }

  const tabs: { id: UploadMode; label: string; icon: React.ReactNode }[] = [
    { id: 'file', label: 'Upload file', icon: <Upload className="h-4 w-4" /> },
    { id: 'text', label: 'Paste text', icon: <Type className="h-4 w-4" /> },
    { id: 'form', label: 'Fill form', icon: <LayoutGrid className="h-4 w-4" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Upload Resume</h1>
          <p className="mt-1 text-sm text-gray-500">Choose a method to start the AI analysis workflow.</p>
        </div>

        <div className="mb-6 flex w-fit gap-2 rounded-xl border border-gray-100 bg-white p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                mode === tab.id ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="card p-8">
          <div className="mb-6">
            <label className="label">Resume Title</label>
            <input
              className="input"
              placeholder="Example: Frontend Engineer Resume"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {mode === 'file' ? (
            <div
              onDrop={onDrop}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => document.getElementById('file-input')?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
                dragOver
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
              }`}
            >
              <input id="file-input" type="file" accept=".pdf,.docx" className="hidden" onChange={onFileChange} />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                    <FileText className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setFile(null)
                    }}
                    className="ml-2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50">
                    <Upload className="h-7 w-7 text-primary-400" />
                  </div>
                  <p className="mb-1 font-medium text-gray-700">Drag a file here or click to choose one</p>
                  <p className="text-sm text-gray-400">PDF or DOCX, up to 10MB</p>
                </>
              )}
            </div>
          ) : null}

          {mode === 'text' ? (
            <div>
              <label className="label">Resume Content</label>
              <textarea
                className="input h-64 resize-none"
                placeholder="Paste the full resume text here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-400">{text.length} characters</p>
            </div>
          ) : null}

          {mode === 'form' ? <FormMode onChange={setText} /> : null}

          {error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}

          <div className="mt-6 flex gap-3">
            <button onClick={() => navigate('/dashboard')} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleSubmit} className="btn-primary flex-1 justify-center" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? 'Submitting...' : 'Upload and analyze'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FormMode({ onChange }: { onChange: (value: string) => void }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    position: '',
    education: '',
    experience: '',
    skills: '',
    projects: '',
  })

  const update = (key: keyof typeof form, value: string) => {
    const next = { ...form, [key]: value }
    setForm(next)
    const parts = [
      next.name && `Name: ${next.name}`,
      next.phone && `Phone: ${next.phone}`,
      next.email && `Email: ${next.email}`,
      next.position && `Target role: ${next.position}`,
      next.education && `\nEducation:\n${next.education}`,
      next.experience && `\nExperience:\n${next.experience}`,
      next.skills && `\nSkills:\n${next.skills}`,
      next.projects && `\nProjects:\n${next.projects}`,
    ].filter(Boolean)
    onChange(parts.join('\n'))
  }

  const fields = [
    { key: 'name', label: 'Name', placeholder: 'Jane Doe', multiline: false },
    { key: 'phone', label: 'Phone', placeholder: '138xxxx1234', multiline: false },
    { key: 'email', label: 'Email', placeholder: 'jane@example.com', multiline: false },
    { key: 'position', label: 'Target Role', placeholder: 'Frontend Engineer', multiline: false },
    { key: 'education', label: 'Education', placeholder: '2022-2026, XX University...', multiline: true },
    { key: 'experience', label: 'Experience', placeholder: 'Company, role, impact...', multiline: true },
    { key: 'skills', label: 'Skills', placeholder: 'React / TypeScript / Node.js...', multiline: true },
    { key: 'projects', label: 'Projects', placeholder: 'Project name, stack, results...', multiline: true },
  ] as const

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.key}>
          <label className="label">{field.label}</label>
          {field.multiline ? (
            <textarea
              className="input h-24 resize-none"
              placeholder={field.placeholder}
              value={form[field.key]}
              onChange={(e) => update(field.key, e.target.value)}
            />
          ) : (
            <input
              className="input"
              placeholder={field.placeholder}
              value={form[field.key]}
              onChange={(e) => update(field.key, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  )
}
