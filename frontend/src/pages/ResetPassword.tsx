import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react'
import { authApi } from '../services/api'
import { Logo } from '../components/Logo'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [codeSending, setCodeSending] = useState(false)
  const [codeCountdown, setCodeCountdown] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [errorToast, setErrorToast] = useState('')
  const [successToast, setSuccessToast] = useState('')

  const showError = (msg: string) => {
    setErrorToast(msg)
    setTimeout(() => setErrorToast(''), 3500)
  }

  const handleSendCode = async () => {
    if (!email) { showError('请先填写邮箱'); return }
    setCodeSending(true)
    try {
      await authApi.sendResetCode(email)
      setCodeCountdown(60)
      const timer = setInterval(() => {
        setCodeCountdown(prev => {
          if (prev <= 1) { clearInterval(timer); return 0 }
          return prev - 1
        })
      }, 1000)
    } catch (e: any) {
      showError(e.response?.data?.error || '发送失败，请稍后重试')
    } finally {
      setCodeSending(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { showError('请输入邮箱'); return }
    if (!code || code.length !== 6) { showError('请输入6位验证码'); return }
    if (!password || password.length < 6) { showError('密码至少6位'); return }
    setSubmitting(true)
    try {
      await authApi.resetPassword(email, code, password)
      setSuccessToast('密码重置成功，请重新登录')
      setTimeout(() => navigate('/login'), 2000)
    } catch (e: any) {
      showError(e.response?.data?.error || '重置失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Toasts */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5
                        bg-green-500 shadow-lg rounded-xl px-4 py-3
                        animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
          <span className="text-[13px] text-white font-medium">{successToast}</span>
        </div>
      )}
      {errorToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5
                        bg-red-500 shadow-lg rounded-xl px-4 py-3
                        animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="w-4 h-4 flex-shrink-0 text-white text-base leading-none">✕</span>
          <span className="text-[13px] text-white font-medium">{errorToast}</span>
        </div>
      )}

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[40%] relative flex-col bg-[#0057d9] overflow-hidden">
        {/* Background gradient layers */}
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: 'linear-gradient(135deg, #006eff 0%, #0047c8 60%, #002f8a 100%)' }} />
        <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full pointer-events-none"
             style={{ background: 'radial-gradient(circle, rgba(127,197,255,0.25) 0%, transparent 65%)' }} />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full pointer-events-none"
             style={{ background: 'radial-gradient(circle, rgba(0,40,140,0.6) 0%, transparent 70%)' }} />

        {/* Logo */}
        <div className="relative z-10 p-10">
          <Link to="/"><Logo variant="dark" size="md" /></Link>
        </div>

        {/* Center content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center pl-8 pr-12 pb-10 gap-8">

          {/* Heading */}
          <div>
            <p className="text-[#b3d5ff] text-xs font-semibold tracking-widest uppercase mb-4">账号安全</p>
            <h2 className="text-[clamp(28px,3vw,42px)] font-bold tracking-[-0.03em] text-white leading-[1.15] mb-3">
              找回你的账号。
            </h2>
            <p className="text-white/55 text-[14px] leading-relaxed">
              通过邮箱验证码确认身份，安全重置你的登录密码。
            </p>
          </div>

          {/* Illustration + badges side by side */}
          <div className="flex items-center gap-4">
            {/* Main illustration */}
            <div className="relative w-56 h-56">
              <svg viewBox="0 0 260 260" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="130" cy="130" r="122" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="6 8" />
                <circle cx="130" cy="130" r="98" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                <circle cx="130" cy="130" r="80" fill="rgba(255,255,255,0.07)" />
                <path d="M130 52 L80 72 L80 118 C80 152 102 180 130 190 C158 180 180 152 180 118 L180 72 Z"
                      fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M130 62 L88 78 L88 118 C88 147 107 172 130 181 C153 172 172 147 172 118 L172 78 Z"
                      fill="rgba(255,255,255,0.07)" />
                <path d="M113 124 L124 136 L148 110" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                <g transform="translate(188, 58)">
                  <rect x="0" y="0" width="36" height="26" rx="5" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" />
                  <polyline points="0,0 18,14 36,0" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
                </g>
                <g transform="translate(38, 168)">
                  <circle cx="10" cy="10" r="9" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" fill="rgba(255,255,255,0.12)" />
                  <line x1="19" y1="10" x2="34" y2="10" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="30" y1="10" x2="30" y2="15" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="25" y1="10" x2="25" y2="13" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
                </g>
                <g transform="translate(186, 168)">
                  <rect x="2" y="11" width="22" height="16" rx="3" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" />
                  <path d="M7 11V8a6 6 0 0 1 12 0v3" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  <circle cx="13" cy="19" r="2" fill="rgba(255,255,255,0.7)" />
                </g>
                <circle cx="68" cy="80" r="2.5" fill="rgba(255,255,255,0.5)" />
                <circle cx="195" cy="148" r="2" fill="rgba(255,255,255,0.4)" />
                <circle cx="155" cy="46" r="2" fill="rgba(255,255,255,0.35)" />
                <circle cx="50" cy="140" r="1.5" fill="rgba(255,255,255,0.3)" />
              </svg>
            </div>

            {/* Trust badges — right column */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-3.5 py-1.5">
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1L2 2.5v3C2 8 3.8 10.2 6 11c2.2-.8 4-3 4-5.5v-3L6 1z" fill="rgba(255,255,255,0.3)" stroke="white" strokeWidth="0.8" />
                  <path d="M4 6l1.5 1.5L8 4.5" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-white/80 text-[11px] font-medium">加密传输</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-3.5 py-1.5">
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                  <rect x="1" y="1" width="10" height="8" rx="1.5" stroke="white" strokeWidth="0.9" fill="rgba(255,255,255,0.2)" />
                  <polyline points="1,1 6,5.5 11,1" stroke="white" strokeWidth="0.9" fill="none" strokeLinejoin="round" />
                </svg>
                <span className="text-white/80 text-[11px] font-medium">邮箱安全验证</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-3.5 py-1.5">
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                  <rect x="1" y="5" width="10" height="7" rx="1.5" stroke="white" strokeWidth="0.9" fill="rgba(255,255,255,0.2)" />
                  <path d="M3.5 5V3.5a2.5 2.5 0 0 1 5 0V5" stroke="white" strokeWidth="0.9" strokeLinecap="round" fill="none" />
                  <circle cx="6" cy="8.5" r="1" fill="white" />
                </svg>
                <span className="text-white/80 text-[11px] font-medium">验证码保护</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 bg-white flex flex-col">
        <div className="lg:hidden p-6">
          <Link to="/"><Logo variant="light" size="sm" /></Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-8 py-10">
          <div className="w-full max-w-[380px]">
            <h1 className="mb-8"
                style={{ fontSize: '28px', fontFamily: '"PingFang SC", sans-serif', color: '#0d1117', fontWeight: 600 }}>
              重置密码
            </h1>

            <div className="flex mb-8 border-b border-gray-200">
              <span className="pb-3 mr-10 font-semibold text-[#006eff] border-b-2 border-[#006eff] -mb-px"
                    style={{ fontSize: '16px', fontFamily: '"PingFang SC", sans-serif' }}>
                邮箱验证
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <input
                type="email"
                placeholder="请输入注册邮箱"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 text-[14px] text-gray-900 rounded-lg border
                           border-gray-300 bg-white outline-none transition-all duration-150
                           placeholder:text-gray-300 focus:border-[#006eff] focus:ring-2 focus:ring-[#006eff]/20"
              />

              {/* Code */}
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="请输入验证码"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="w-full px-4 py-2.5 pr-28 text-[14px] text-gray-900 rounded-lg border
                             border-gray-300 bg-white outline-none transition-all duration-150
                             placeholder:text-gray-300 focus:border-[#006eff] focus:ring-2 focus:ring-[#006eff]/20"
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={codeSending || codeCountdown > 0}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-medium
                             text-[#0066cc] hover:text-[#0052a3] disabled:text-gray-300
                             disabled:cursor-not-allowed whitespace-nowrap transition-colors"
                >
                  {codeCountdown > 0 ? `${codeCountdown}s 后重试` : codeSending ? '发送中...' : '获取验证码'}
                </button>
              </div>

              {/* New password */}
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="请输入新密码（至少6位）"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-4 pr-11 py-2.5 text-[14px] text-gray-900 rounded-lg border
                             border-gray-300 bg-white outline-none transition-all duration-150
                             placeholder:text-gray-300 focus:border-[#006eff] focus:ring-2 focus:ring-[#006eff]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2
                             text-gray-300 hover:text-gray-500 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 bg-[#006eff] text-white text-[14px] font-medium
                           py-2.5 rounded-lg hover:bg-[#2b7afb] active:scale-[0.99]
                           transition-all duration-150 disabled:opacity-40
                           flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                重置密码
              </button>
            </form>

            <p className="mt-6 text-center text-[13px] text-gray-400">
              想起密码了？<Link to="/login" className="text-[#0066cc] hover:underline">返回登录</Link>
            </p>
          </div>
        </div>

        <div className="px-8 pb-6 text-center">
          <p className="text-[12px] text-gray-300">&copy; 2026 Baize Resume. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
