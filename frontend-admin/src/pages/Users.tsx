import { useEffect, useRef, useState } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { adminApi, type AdminUserItem } from '../services/api'

interface UserFormData {
  email: string; password: string; nickname: string; tier: string; is_admin: boolean; is_disabled: boolean
}
const defaultForm: UserFormData = { email: '', password: '', nickname: '', tier: 'free', is_admin: false, is_disabled: false }

function UserModal({ mode, initial, onClose, onSave }: {
  mode: 'create' | 'edit'; initial: UserFormData; onClose: () => void; onSave: (d: UserFormData) => Promise<void>
}) {
  const [form, setForm] = useState<UserFormData>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'create' && !form.password) { setError('请输入密码'); return }
    setSaving(true); setError('')
    try { await onSave(form); onClose() }
    catch (err: unknown) { setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || '操作失败') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E7E7E7]">
          <h2 className="text-sm font-medium text-gray-900">{mode === 'create' ? '新建用户' : '编辑用户'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {mode === 'create' && (
            <div>
              <label className="label">邮箱 <span className="text-[#E34D59]">*</span></label>
              <input className="input" type="email" required value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@example.com" />
            </div>
          )}
          <div>
            <label className="label">
              密码{mode === 'edit' && <span className="text-gray-400 font-normal ml-1 text-xs">（留空则不修改）</span>}
              {mode === 'create' && <span className="text-[#E34D59]"> *</span>}
            </label>
            <input className="input" type="password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder={mode === 'edit' ? '不修改请留空' : '至少 6 位'}
              minLength={form.password ? 6 : undefined} />
          </div>
          <div>
            <label className="label">昵称</label>
            <input className="input" value={form.nickname}
              onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))} placeholder="可选" />
          </div>
          <div>
            <label className="label">套餐</label>
            <select className="input" value={form.tier} onChange={e => setForm(f => ({ ...f, tier: e.target.value }))}>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
            </select>
          </div>
          <div className="flex items-center gap-5">
            <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer select-none">
              <input type="checkbox" checked={form.is_admin}
                onChange={e => setForm(f => ({ ...f, is_admin: e.target.checked }))}
                className="w-3.5 h-3.5 accent-[#0052D9]" />
              管理员权限
            </label>
            {mode === 'edit' && (
              <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer select-none">
                <input type="checkbox" checked={form.is_disabled}
                  onChange={e => setForm(f => ({ ...f, is_disabled: e.target.checked }))}
                  className="w-3.5 h-3.5 accent-[#E34D59]" />
                禁用账号
              </label>
            )}
          </div>
          {error && <p className="text-xs text-[#E34D59]">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">取消</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? '保存中...' : '确定'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// 状态圆点
function StatusDot({ active }: { active: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: active ? '#00A870' : '#E34D59' }} />
      <span style={{ color: active ? '#00A870' : '#E34D59', fontSize: 13 }}>{active ? '正常' : '禁用'}</span>
    </span>
  )
}

const NOTICE_MESSAGES = [
  '这里是提示信息内容，可根据需要自定义文字。',
  '第二条提示消息，支持多条轮播展示。',
  '第三条提示消息，每 5 秒自动切换。',
]

const FILTER_ATTRS = [
  { key: 'name', label: '名称' },
  { key: 'email', label: '邮箱' },
  { key: 'tier', label: '套餐' },
]

function SearchBar({ value, onChange, onSearch }: {
  value: string; onChange: (v: string) => void; onSearch: () => void
}) {
  const [attrOpen, setAttrOpen] = useState(false)
  const [selectedAttr, setSelectedAttr] = useState<string | null>(null)
  const attrRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!attrOpen) return
    const handler = (e: MouseEvent) => {
      if (attrRef.current && !attrRef.current.contains(e.target as Node)) setAttrOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [attrOpen])

  const placeholder = selectedAttr
    ? `按${FILTER_ATTRS.find(a => a.key === selectedAttr)?.label}搜索`
    : '搜索邮箱或昵称'

  const [focused, setFocused] = useState(false)

  return (
    <div style={{ position: 'relative', margin: '15px 0' }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        height: 30, background: '#fff',
        border: `1px solid ${focused ? '#4D8FF0' : '#DCDCDC'}`, borderRadius: 3,
        padding: '0 12px 0 36px', position: 'relative',
        boxSizing: 'border-box',
        transition: 'border-color 0.15s',
      }}>
        {/* 左侧过滤图标 */}
        <div ref={attrRef} style={{ position: 'absolute', left: 0, top: 0, height: '100%', display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => setAttrOpen(v => !v)}
            title="选择过滤属性"
            style={{
              width: 36, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', background: 'none', cursor: 'pointer',
              color: selectedAttr ? '#0052D9' : '#999', borderRadius: '3px 0 0 3px',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F2F3F5')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            {/* 搜索过滤图标 */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <line x1="1.5" y1="7" x2="4" y2="7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="9.5" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.4"/>
              <line x1="12" y1="9.5" x2="14" y2="11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
          {/* 属性选择下拉卡片 */}
          {attrOpen && (
            <div style={{
              position: 'absolute', top: 34, left: 0, zIndex: 200,
              background: '#fff', border: '1px solid #E7E7E7',
              borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,.1)',
              minWidth: 160, padding: '8px 0',
            }}>
              <div style={{ padding: '4px 12px 8px', fontSize: 12, color: '#999', borderBottom: '1px solid #F0F0F0', marginBottom: 4 }}>
                选择资源属性进行过滤
              </div>
              {FILTER_ATTRS.map(attr => (
                <div
                  key={attr.key}
                  onClick={() => { setSelectedAttr(attr.key); setAttrOpen(false) }}
                  style={{
                    padding: '7px 16px', fontSize: 12, cursor: 'pointer',
                    color: selectedAttr === attr.key ? '#0052D9' : '#333',
                    background: selectedAttr === attr.key ? '#EAF2FF' : 'transparent',
                    fontFamily: '-apple-system, "system-ui", sans-serif',
                  }}
                  onMouseEnter={e => { if (selectedAttr !== attr.key) e.currentTarget.style.background = '#F2F3F5' }}
                  onMouseLeave={e => { e.currentTarget.style.background = selectedAttr === attr.key ? '#EAF2FF' : 'transparent' }}
                >{attr.label}</div>
              ))}
              {selectedAttr && (
                <div
                  onClick={() => { setSelectedAttr(null); setAttrOpen(false) }}
                  style={{ padding: '7px 16px', fontSize: 12, cursor: 'pointer', color: '#E34D59', borderTop: '1px solid #F0F0F0', marginTop: 4 }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FFF5F5')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >清除过滤</div>
              )}
            </div>
          )}
        </div>

        {/* 搜索输入框 */}
        <input
          style={{
            flex: 1, height: '100%', border: 'none', outline: 'none',
            fontSize: 12, color: '#333', background: 'transparent',
            fontFamily: '-apple-system, "system-ui", sans-serif',
          }}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={e => { if (e.key === 'Enter') onSearch() }}
        />

      </div>
    </div>
  )
}

const MORE_ACTIONS = ['导出用户列表', '批量禁用', '批量删除']

function MoreActionsMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          height: 30, padding: '0 12px',
          fontSize: 12, color: '#333',
          background: '#fff', border: '1px solid #DCDCDC',
          borderRadius: 3, cursor: 'pointer', whiteSpace: 'nowrap',
          fontFamily: '-apple-system, "system-ui", sans-serif',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#F2F3F5' }}
        onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
      >
        更多操作<ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 34, left: 0, zIndex: 100,
          background: '#fff', border: '1px solid #E7E7E7',
          borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,.1)',
          minWidth: 120, padding: '4px 0',
        }}>
          {MORE_ACTIONS.map(action => (
            <div
              key={action}
              onClick={() => setOpen(false)}
              style={{
                padding: '7px 16px', fontSize: 12, color: '#333', cursor: 'pointer',
                fontFamily: '-apple-system, "system-ui", sans-serif',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F2F3F5')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >{action}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function NavBtn({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 26, minWidth: 26, padding: '0 4px', fontSize: 11,
        border: '1px solid #DCDCDC', borderRadius: 2, background: '#fff',
        color: disabled ? '#C0C4CC' : '#606266', cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >{children}</button>
  )
}

export default function AdminUsers() {
  const [items, setItems] = useState<AdminUserItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [inputQ, setInputQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [noticeDismissed, setNoticeDismissed] = useState(false)
  const [noticeIndex, setNoticeIndex] = useState(0)
  const noticeTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const pageSize = 20

  useEffect(() => {
    if (noticeDismissed || NOTICE_MESSAGES.length <= 1) return
    noticeTimer.current = setInterval(() => {
      setNoticeIndex(i => (i + 1) % NOTICE_MESSAGES.length)
    }, 5000)
    return () => { if (noticeTimer.current) clearInterval(noticeTimer.current) }
  }, [noticeDismissed])

  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; item?: AdminUserItem } | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const allSelected = items.length > 0 && items.every(u => selectedIds.has(u.id))
  const someSelected = items.some(u => selectedIds.has(u.id)) && !allSelected

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(prev => { const s = new Set(prev); items.forEach(u => s.delete(u.id)); return s })
    } else {
      setSelectedIds(prev => { const s = new Set(prev); items.forEach(u => s.add(u.id)); return s })
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

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
      await adminApi.updateUser(u.id, { nickname: u.nickname, tier: u.tier, is_admin: u.is_admin, is_disabled: !u.is_disabled })
      setItems(prev => prev.map(item => item.id === u.id ? { ...item, is_disabled: !u.is_disabled } : item))
    } finally { setTogglingId(null) }
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await adminApi.deleteUser(id)
      setItems(prev => prev.filter(u => u.id !== id))
      setTotal(t => t - 1)
    } finally { setDeletingId(null); setConfirmDeleteId(null) }
  }

  return (
    <div>

      {/* 页头 —— 白底全宽 header，突破 main 的 p-5 内边距 */}
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid #E7E7E7',
          padding: '12px 20px',
          position: 'relative',
          margin: '-20px -20px 0',
        }}
      >
        <h1 className="text-base font-medium text-gray-900">用户管理</h1>
      </div>

      {/* 提示栏 */}
      {!noticeDismissed && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          background: '#E3ECFF',
          border: '1px solid #E3ECFF',
          borderRadius: 3, padding: '9px 16px',
          margin: '20px 0 0',
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
            <circle cx="8" cy="8" r="7" stroke="#0052D9" strokeWidth="1.5" />
            <rect x="7.25" y="7" width="1.5" height="5" rx="0.75" fill="#0052D9" />
            <rect x="7.25" y="4" width="1.5" height="1.5" rx="0.75" fill="#0052D9" />
          </svg>
          <span style={{ flex: 1, fontSize: 12, color: 'rgba(0,0,0,0.9)', lineHeight: '20px', fontFamily: '-apple-system, "system-ui", sans-serif' }}>
            {NOTICE_MESSAGES[noticeIndex]}
          </span>
          {/* 翻页控件 */}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 12 }}>
            <button
              onClick={() => setNoticeIndex(i => (i - 1 + NOTICE_MESSAGES.length) % NOTICE_MESSAGES.length)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: 'rgba(0,0,0,0.4)', lineHeight: 1, fontSize: 12 }}
            >‹</button>
            <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', fontFamily: '-apple-system, "system-ui", sans-serif', userSelect: 'none', minWidth: 28, textAlign: 'center' }}>
              {noticeIndex + 1} / {NOTICE_MESSAGES.length}
            </span>
            <button
              onClick={() => setNoticeIndex(i => (i + 1) % NOTICE_MESSAGES.length)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: 'rgba(0,0,0,0.4)', lineHeight: 1, fontSize: 12 }}
            >›</button>
          </span>
          <button
            onClick={() => setNoticeDismissed(true)}
            style={{ flexShrink: 0, color: 'rgba(0,0,0,0.35)', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 2, marginLeft: 8 }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 操作栏 —— 新建按钮 */}
      <div style={{ paddingLeft: 0, paddingTop: 20, paddingBottom: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* 新建用户 */}
        <button
          onClick={() => setModal({ mode: 'create' })}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            height: 30, padding: '0 20px',
            fontSize: 12, color: 'rgba(255,255,255,0.9)',
            background: '#0052D9', border: '1px solid #0052D9',
            borderRadius: 3, cursor: 'pointer', whiteSpace: 'nowrap',
            fontFamily: '-apple-system, "system-ui", sans-serif',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#0a60f0')}
          onMouseLeave={e => (e.currentTarget.style.background = '#0052D9')}
        >
          新建用户
        </button>

        {/* 更多操作 下拉 */}
        <MoreActionsMenu />
      </div>

      {/* 搜索栏 */}
      <SearchBar
        value={inputQ}
        onChange={setInputQ}
        onSearch={() => { setQ(inputQ); setPage(1) }}
      />

      {/* 主内容卡片 */}
      <div className="card overflow-hidden">

        {/* 表格 */}
        <table className="t-table">
          <thead>
            <tr>
              <th style={{ width: 40, textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected }}
                  onChange={toggleSelectAll}
                  style={{ width: 13, height: 13, cursor: 'pointer', accentColor: '#0052D9' }}
                />
              </th>
              <th>用户名</th>
              <th>状态</th>
              <th>套餐</th>
              <th>分析次数</th>
              <th>注册时间</th>
              <th>邮箱</th>
              <th style={{ textAlign: 'right' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">加载中...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">暂无数据</td></tr>
            ) : items.map(u => (
              <tr key={u.id} style={{ opacity: u.is_disabled ? 0.6 : 1, background: selectedIds.has(u.id) ? '#F0F6FF' : '' }}>
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(u.id)}
                    onChange={() => toggleSelect(u.id)}
                    style={{ width: 13, height: 13, cursor: 'pointer', accentColor: '#0052D9' }}
                  />
                </td>
                <td>
                  <span
                    onClick={() => setModal({ mode: 'edit', item: u })}
                    style={{ color: '#0052D9', cursor: 'pointer', fontSize: 13 }}
                    onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                  >{u.nickname || '—'}</span>
                </td>
                <td><StatusDot active={!u.is_disabled} /></td>
                <td>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '1px 8px', borderRadius: 2, fontSize: 12,
                    background: u.tier === 'pro' ? '#EAF2FF' : '#F5F5F5',
                    color: u.tier === 'pro' ? '#0052D9' : '#888',
                  }}>
                    {u.tier === 'pro' ? 'Pro' : 'Free'}
                  </span>
                </td>
                <td className="text-gray-600">{u.analysis_used}</td>
                <td className="text-gray-400 text-xs whitespace-nowrap">
                  {new Date(u.created_at).toLocaleDateString('zh-CN')}
                </td>
                <td className="text-gray-500 text-xs">{u.email}</td>
                <td style={{ textAlign: 'right' }}>
                  {confirmDeleteId === u.id ? (
                    <span className="flex items-center justify-end gap-2">
                      <span className="text-xs text-gray-500">确认删除？</span>
                      <button onClick={() => handleDelete(u.id)} disabled={deletingId === u.id}
                        className="text-xs text-[#E34D59] hover:underline disabled:opacity-50">
                        {deletingId === u.id ? '删除中' : '确认'}
                      </button>
                      <span className="text-gray-200">|</span>
                      <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-500 hover:underline">
                        取消
                      </button>
                    </span>
                  ) : (
                    <span className="flex items-center justify-end gap-1" style={{ color: '#0052D9' }}>
                      <button onClick={() => setModal({ mode: 'edit', item: u })}
                        className="text-xs hover:underline px-1" style={{ color: '#0052D9' }}>编辑</button>
                      <span style={{ color: '#E0E0E0' }}>|</span>
                      <button onClick={() => handleToggleDisabled(u)} disabled={togglingId === u.id}
                        className="text-xs hover:underline px-1 disabled:opacity-50"
                        style={{ color: u.is_disabled ? '#00A870' : '#E34D59' }}>
                        {u.is_disabled ? '启用' : '禁用'}
                      </button>
                      <span style={{ color: '#E0E0E0' }}>|</span>
                      <button onClick={() => setConfirmDeleteId(u.id)}
                        className="text-xs hover:underline px-1" style={{ color: '#E34D59' }}>删除</button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 分页 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid #F0F0F0' }}>
          <span style={{ fontSize: 12, color: '#888' }}>共 {total} 条</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {/* 每页条数 */}
            <select
              value={pageSize}
              onChange={() => {}}
              style={{ height: 26, fontSize: 12, color: '#606266', border: '1px solid #DCDCDC', borderRadius: 2, padding: '0 4px', background: '#fff', cursor: 'pointer' }}
            >
              {[10, 20, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span style={{ fontSize: 12, color: '#888', marginRight: 8 }}>条/页</span>

            {/* 首页 */}
            <NavBtn onClick={() => setPage(1)} disabled={page === 1}>{'|◄'}</NavBtn>
            {/* 上一页 */}
            <NavBtn onClick={() => setPage(p => p - 1)} disabled={page === 1}>{'◄'}</NavBtn>

            {/* 页码输入 */}
            <input
              type="number" min={1} max={totalPages || 1}
              value={page}
              onChange={e => {
                const v = parseInt(e.target.value)
                if (v >= 1 && v <= (totalPages || 1)) setPage(v)
              }}
              style={{ width: 40, height: 26, textAlign: 'center', fontSize: 12, border: '1px solid #DCDCDC', borderRadius: 2, color: '#333', outline: 'none' }}
            />
            <span style={{ fontSize: 12, color: '#888' }}>/ {totalPages || 1} 页</span>

            {/* 下一页 */}
            <NavBtn onClick={() => setPage(p => p + 1)} disabled={page >= (totalPages || 1)}>{'►'}</NavBtn>
            {/* 末页 */}
            <NavBtn onClick={() => setPage(totalPages || 1)} disabled={page >= (totalPages || 1)}>{'►|'}</NavBtn>
          </div>
        </div>
      </div>

      {modal && (
        <UserModal mode={modal.mode}
          initial={modal.item ? { email: modal.item.email, password: '', nickname: modal.item.nickname, tier: modal.item.tier, is_admin: modal.item.is_admin, is_disabled: modal.item.is_disabled } : defaultForm}
          onClose={() => setModal(null)} onSave={handleSave} />
      )}
    </div>
  )
}
