import React, { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'
import { authApi } from '../services/api'
import { useAuthStore } from '../store/auth'
import { Logo } from '../components/Logo'

const registerSchema = z.object({
  username: z.string()
    .min(3, '用户名至少3个字符')
    .max(50, '用户名最多50个字符')
    .regex(/^[a-z][a-z0-9_]*$/, '用户名须以小写字母开头，只能含小写字母、数字和下划线'),
  password: z.string().min(6, '密码至少 6 位'),
  email: z.string().email('请输入有效的邮箱'),
  code: z.string().length(6, '请输入6位验证码'),
})

type RegisterForm = z.infer<typeof registerSchema>

const features = [
  '5 维度 AI 评分，精准定位短板',
  '逐条优化建议，附改写示例',
  'JD 匹配分析，提升投递通过率',
  '支持 PDF / DOCX / 文本三种方式',
]

export default function Auth({ mode }: { mode: 'login' | 'register' }) {
  const navigate = useNavigate()
  const { setTokens, setUser } = useAuthStore()
  const [showPw, setShowPw] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [codeSending, setCodeSending] = useState(false)
  const [codeCountdown, setCodeCountdown] = useState(0)
  const [codeSent, setCodeSent] = useState(false)
  const [errorToast, setErrorToast] = useState('')
  const [successToast, setSuccessToast] = useState('')
  const [loginSubmitting, setLoginSubmitting] = useState(false)

  // Login form refs — bypass react-hook-form to handle browser autofill correctly
  const accountRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const showError = (msg: string) => {
    setErrorToast(msg)
    setTimeout(() => setErrorToast(''), 3000)
  }

  const showSuccess = (msg: string) => {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(''), 2000)
  }

  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

  const handleSendCode = async () => {
    const email = registerForm.getValues('email')
    if (!email) { showError('请先填写邮箱'); return }
    setCodeSending(true)
    try {
      await authApi.checkEmail(email)
      await authApi.sendCode(email)
      setCodeSent(true)
      setCodeCountdown(60)
      setTimeout(() => setCodeSent(false), 3000)
      const timer = setInterval(() => {
        setCodeCountdown(prev => {
          if (prev <= 1) { clearInterval(timer); return 0 }
          return prev - 1
        })
      }, 1000)
    } catch (e: any) {
      showError(e.response?.data?.error || '发送失败，请检查邮箱，稍后重试')
    } finally {
      setCodeSending(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const account = accountRef.current?.value?.trim() || ''
    const password = passwordRef.current?.value || ''
    if (!agreed) { showError('请先勾选同意服务协议和隐私政策'); return }
    if (!account) { showError('请输入账号或邮箱'); return }
    if (!password) { showError('请输入密码'); return }
    setLoginSubmitting(true)
    try {
      const { data: tokens } = await authApi.login(account, password)
      setTokens(tokens.access_token, tokens.refresh_token)
      const { data: me } = await authApi.me()
      setUser({
        id: me.user_id,
        email: me.email,
        username: me.username,
        tier: me.tier,
        is_admin: me.is_admin,
        analysis_used: me.analysis_used,
        subscription_end: me.subscription_end,
      })
      navigate('/dashboard')
    } catch (e: any) {
      showError(e.response?.data?.error || '账号或密码不正确')
    } finally {
      setLoginSubmitting(false)
    }
  }

  const handleRegister = registerForm.handleSubmit(async (data) => {
    try {
      await authApi.register(data.username, data.email, data.password, data.code)
      showSuccess('注册成功，欢迎使用 BAIZE')
      setTimeout(() => navigate('/login'), 2000)
    } catch (e: any) {
      showError(e.response?.data?.error || '注册失败，请稍后重试')
    }
  })

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
      {codeSent && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5
                        bg-green-500 shadow-lg rounded-xl px-4 py-3
                        animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
          <span className="text-[13px] text-white font-medium">验证码已发送，请查收邮件</span>
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

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[40%] relative flex-col
                      bg-[#006eff] overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none opacity-20"
             style={{ background: 'radial-gradient(circle, #7fc5ff 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full pointer-events-none opacity-15"
             style={{ background: 'radial-gradient(circle, #004db3 0%, transparent 70%)' }} />

        {/* Logo top-left */}
        <div className="relative z-10 p-10">
          <Link to="/">
            <Logo variant="dark" size="md" />
          </Link>
        </div>

        {/* Center content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-14 pb-16">
          <p className="text-[#b3d5ff] text-sm font-medium tracking-widest uppercase mb-5">
            AI 简历优化平台
          </p>
          <h2 className="text-[clamp(32px,3.5vw,52px)] font-bold tracking-[-0.03em]
                          text-white leading-[1.1] mb-8">
            30 秒，
            <br />让简历更出色。
          </h2>

          <ul className="space-y-4">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3.5">
                <CheckCircle2 className="w-4 h-4 text-[#7fc5ff] flex-shrink-0" />
                <span className="text-white/80 text-[15px]">{f}</span>
              </li>
            ))}
          </ul>

          {/* Decorative score ring */}
          <div className="mt-16 flex items-center gap-4">
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                <circle cx="40" cy="40" r="33" fill="none" stroke="#ffffff20" strokeWidth="8" />
                <circle cx="40" cy="40" r="33" fill="none" stroke="#ffffff"
                        strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 33 * 0.82} ${2 * Math.PI * 33}`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-white font-bold text-lg leading-none">82</span>
                <span className="text-white/60 text-[9px] mt-0.5">评分</span>
              </div>
            </div>
            <div>
              <p className="text-white text-sm font-medium">平均简历提升分数</p>
              <p className="text-white/60 text-xs mt-0.5">基于优化前后对比数据</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 bg-white flex flex-col">

        {/* Mobile logo (only on small screens) */}
        <div className="lg:hidden p-6">
          <Link to="/">
            <Logo variant="light" size="sm" />
          </Link>
        </div>

        {/* Form area - vertically centered */}
        <div className="flex-1 flex items-center justify-center px-8 py-10">
          <div className="w-full max-w-[380px]">

            {/* Title */}
            <h1 className="mb-8 whitespace-nowrap"
                style={{ fontSize: '28px', fontFamily: '"PingFang SC", sans-serif', color: '#0d1117', fontWeight: 600 }}>
              {mode === 'login' ? '登录，即刻开启简历优化' : '创建你的账号'}
            </h1>

            {/* Tab switcher */}
            <div className="flex mb-8 border-b border-gray-200">
              <span
                className="pb-3 mr-10 font-semibold text-[#006eff] border-b-2 border-[#006eff] -mb-px"
                style={{ fontSize: '16px', fontFamily: '"PingFang SC", sans-serif' }}
              >
                {mode === 'login' ? '密码登录' : '账号注册'}
              </span>
            </div>

            {/* Login form */}
            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <input
                  ref={accountRef}
                  type="text"
                  name="account"
                  autoComplete="username"
                  placeholder="账号或邮箱"
                  className="w-full px-4 py-2.5 text-[14px] text-gray-900 rounded-lg border
                             border-gray-300 bg-white outline-none transition-all duration-150
                             placeholder:text-gray-300 focus:border-[#006eff] focus:ring-2 focus:ring-[#006eff]/20"
                />
                <div className="relative">
                  <input
                    ref={passwordRef}
                    type={showPw ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    placeholder="密码"
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
                {/* Agreement */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded accent-[#006eff]"
                      checked={agreed}
                      onChange={e => setAgreed(e.target.checked)}
                    />
                    <span className="text-[13px] text-gray-500">
                      我已阅读并同意
                      <a href="#" className="text-[#0066cc] hover:underline mx-0.5">服务协议</a>
                      和
                      <a href="#" className="text-[#0066cc] hover:underline ml-0.5">隐私政策</a>
                    </span>
                  </label>
                  <Link to="/reset-password" className="text-[13px] text-[#0066cc] hover:underline whitespace-nowrap ml-3">忘记密码</Link>
                </div>
                <button
                  type="submit"
                  disabled={loginSubmitting}
                  className="w-full mt-10 bg-[#006eff] text-white text-[14px] font-medium
                             py-2.5 rounded-lg hover:bg-[#2b7afb] active:scale-[0.99]
                             transition-all duration-150 disabled:opacity-40
                             flex items-center justify-center gap-2"
                >
                  {loginSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  登录
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <FieldInput
                  type="text"
                  placeholder="请输入用户名"
                  error={registerForm.formState.errors.username?.message}
                  {...registerForm.register('username')}
                />
                <FieldPasswordInput
                  placeholder="请输入密码"
                  show={showPw}
                  onToggle={() => setShowPw(!showPw)}
                  error={registerForm.formState.errors.password?.message}
                  {...registerForm.register('password')}
                />
                <FieldInput
                  type="email"
                  placeholder="请输入邮箱"
                  error={registerForm.formState.errors.email?.message}
                  {...registerForm.register('email')}
                />
                {/* 验证码 */}
                <div>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="请输入验证码"
                      className={`w-full px-4 py-2.5 pr-28 text-[14px] text-gray-900 rounded-lg border
                                  outline-none transition-all duration-150 placeholder:text-gray-300
                                  focus:border-[#006eff] focus:ring-2 focus:ring-[#006eff]/20
                                  ${registerForm.formState.errors.code ? 'border-[#ff3b30] bg-red-50/30' : 'border-gray-300 bg-white'}`}
                      {...registerForm.register('code')}
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
                  {registerForm.formState.errors.code && (
                    <p className="mt-1.5 text-[12px] text-[#ff3b30]">{registerForm.formState.errors.code.message}</p>
                  )}
                </div>
                {/* Agreement */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" className="w-4 h-4 rounded accent-[#1F264D]" />
                  <span className="text-[13px] text-gray-500">
                    我已阅读并同意
                    <a href="#" className="text-[#0066cc] hover:underline mx-0.5">服务协议</a>
                    和
                    <a href="#" className="text-[#0066cc] hover:underline ml-0.5">隐私政策</a>
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={registerForm.formState.isSubmitting}
                  className="w-full mt-2 bg-[#006eff] text-white text-[14px] font-medium
                             py-2.5 rounded-lg hover:bg-[#2b7afb] active:scale-[0.99]
                             transition-all duration-150 disabled:opacity-40
                             flex items-center justify-center gap-2"
                >
                  {registerForm.formState.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  创建账号
                </button>
              </form>
            )}

            <p className="mt-6 text-center text-[13px] text-gray-400">
              {mode === 'login' ? (
                <>还没有账号？<Link to="/register" className="text-[#0066cc] hover:underline">免费注册</Link></>
              ) : (
                <>已有账号？<Link to="/login" className="text-[#0066cc] hover:underline">立即登录</Link></>
              )}
            </p>
          </div>
        </div>

        {/* Bottom */}
        <div className="px-8 pb-6 text-center">
          <p className="text-[12px] text-gray-300">&copy; 2026 Baize Resume. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

// ── Input components ──

interface FieldInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const FieldInput = React.forwardRef<HTMLInputElement, FieldInputProps>(
  ({ label, error, ...props }, ref) => (
    <div>
      {label && <label className="block text-[13px] font-medium text-gray-600 mb-1.5">{label}</label>}
      <input
        ref={ref}
        className={`w-full px-4 py-2.5 text-[14px] text-gray-900 rounded-lg border
                    outline-none transition-all duration-150 placeholder:text-gray-300
                    focus:border-[#006eff] focus:ring-2 focus:ring-[#006eff]/20
                    ${error ? 'border-[#ff3b30] bg-red-50/30' : 'border-gray-300 bg-white'}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-[12px] text-[#ff3b30]">{error}</p>}
    </div>
  )
)
FieldInput.displayName = 'FieldInput'

interface FieldPasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  show: boolean
  onToggle: () => void
  error?: string
}

const FieldPasswordInput = React.forwardRef<HTMLInputElement, FieldPasswordInputProps>(
  ({ label, show, onToggle, error, ...props }, ref) => (
    <div>
      {label && <label className="block text-[13px] font-medium text-gray-600 mb-1.5">{label}</label>}
      <div className="relative">
        <input
          ref={ref}
          type={show ? 'text' : 'password'}
          className={`w-full pl-4 pr-11 py-2.5 text-[14px] text-gray-900 rounded-lg border
                      outline-none transition-all duration-150 placeholder:text-gray-300
                      focus:border-[#006eff] focus:ring-2 focus:ring-[#006eff]/20
                      ${error ? 'border-[#ff3b30] bg-red-50/30' : 'border-gray-300 bg-white'}`}
          {...props}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3.5 top-1/2 -translate-y-1/2
                     text-gray-300 hover:text-gray-500 transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="mt-1.5 text-[12px] text-[#ff3b30]">{error}</p>}
    </div>
  )
)
FieldPasswordInput.displayName = 'FieldPasswordInput'
