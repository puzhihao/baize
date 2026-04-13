import React, { useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Logo } from '../components/Logo'
import { authApi } from '../services/api'
import { useAuthStore } from '../store/auth'

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be 50 characters or fewer')
    .regex(/^[a-z][a-z0-9_]*$/, 'Use lowercase letters, numbers, and underscores only'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  email: z.string().email('Enter a valid email address'),
  code: z.string().length(6, 'Enter the 6-digit verification code'),
})

type RegisterForm = z.infer<typeof registerSchema>

const features = [
  'Five-dimension AI scoring',
  'Targeted rewriting suggestions',
  'JD matching analysis',
  'PDF, DOCX, and plain text support',
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
  const accountRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

  const showError = (msg: string) => {
    setErrorToast(msg)
    setTimeout(() => setErrorToast(''), 3000)
  }

  const showSuccess = (msg: string) => {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(''), 2000)
  }

  const handleSendCode = async () => {
    const email = registerForm.getValues('email')
    if (!email) {
      showError('Enter your email first')
      return
    }

    setCodeSending(true)
    try {
      await authApi.checkEmail(email)
      await authApi.sendCode(email)
      setCodeSent(true)
      setCodeCountdown(60)
      setTimeout(() => setCodeSent(false), 3000)
      const timer = setInterval(() => {
        setCodeCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (e: any) {
      showError(e.response?.data?.error || 'Failed to send verification code')
    } finally {
      setCodeSending(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const account = accountRef.current?.value?.trim() || ''
    const password = passwordRef.current?.value || ''

    if (!agreed) {
      showError('Please accept the terms first')
      return
    }
    if (!account) {
      showError('Enter your account or email')
      return
    }
    if (!password) {
      showError('Enter your password')
      return
    }

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
      showError(e.response?.data?.error || 'Incorrect account or password')
    } finally {
      setLoginSubmitting(false)
    }
  }

  const handleRegister = registerForm.handleSubmit(async (data) => {
    if (!agreed) {
      showError('Please accept the terms first')
      return
    }

    try {
      await authApi.register(data.username, data.email, data.password, data.code)
      showSuccess('Registration complete')
      setTimeout(() => navigate('/login'), 1200)
    } catch (e: any) {
      showError(e.response?.data?.error || 'Registration failed')
    }
  })

  return (
    <div className="flex min-h-screen">
      {successToast ? <Toast kind="success" text={successToast} /> : null}
      {codeSent ? <Toast kind="success" text="Verification code sent" /> : null}
      {errorToast ? <Toast kind="error" text={errorToast} /> : null}

      <div className="relative hidden flex-col overflow-hidden bg-[#006eff] lg:flex lg:w-[40%]">
        <div
          className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #7fc5ff 0%, transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #004db3 0%, transparent 70%)' }}
        />

        <div className="relative z-10 p-10">
          <Link to="/">
            <Logo variant="dark" size="md" />
          </Link>
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-center px-14 pb-16">
          <p className="mb-5 text-sm font-medium uppercase tracking-widest text-[#b3d5ff]">
            AI Resume Assistant
          </p>
          <h2 className="mb-8 text-[clamp(32px,3.5vw,52px)] font-bold leading-[1.1] tracking-[-0.03em] text-white">
            Make your resume
            <br />
            speak clearly
          </h2>

          <ul className="space-y-4">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-3.5">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#7fc5ff]" />
                <span className="text-[15px] text-white/80">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-1 flex-col bg-white">
        <div className="p-6 lg:hidden">
          <Link to="/">
            <Logo variant="light" size="sm" />
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-8 py-10">
          <div className="w-full max-w-[380px]">
            <h1 className="mb-8 text-[28px] font-semibold text-[#0d1117]">
              {mode === 'login' ? 'Sign in to continue' : 'Create your account'}
            </h1>

            <div className="mb-8 flex border-b border-gray-200">
              <span className="border-b-2 border-[#006eff] pb-3 text-[16px] font-semibold text-[#006eff]">
                {mode === 'login' ? 'Password login' : 'Register'}
              </span>
            </div>

            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <input
                  ref={accountRef}
                  type="text"
                  name="account"
                  autoComplete="username"
                  placeholder="Account or email"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-[14px] text-gray-900 outline-none transition-all duration-150 placeholder:text-gray-300 focus:border-[#006eff] focus:ring-2 focus:ring-[#006eff]/20"
                />
                <div className="relative">
                  <input
                    ref={passwordRef}
                    type={showPw ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    placeholder="Password"
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-4 pr-11 text-[14px] text-gray-900 outline-none transition-all duration-150 placeholder:text-gray-300 focus:border-[#006eff] focus:ring-2 focus:ring-[#006eff]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 transition-colors hover:text-gray-500"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Agreement checked={agreed} onChange={setAgreed} />
                <button
                  type="submit"
                  disabled={loginSubmitting}
                  className="mt-10 flex w-full items-center justify-center gap-2 rounded-lg bg-[#006eff] py-2.5 text-[14px] font-medium text-white transition-all duration-150 active:scale-[0.99] hover:bg-[#2b7afb] disabled:opacity-40"
                >
                  {loginSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Sign in
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <FieldInput
                  type="text"
                  placeholder="Username"
                  error={registerForm.formState.errors.username?.message}
                  {...registerForm.register('username')}
                />
                <FieldPasswordInput
                  placeholder="Password"
                  show={showPw}
                  onToggle={() => setShowPw((prev) => !prev)}
                  error={registerForm.formState.errors.password?.message}
                  {...registerForm.register('password')}
                />
                <FieldInput
                  type="email"
                  placeholder="Email"
                  error={registerForm.formState.errors.email?.message}
                  {...registerForm.register('email')}
                />
                <div>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Verification code"
                      className={`w-full rounded-lg border px-4 py-2.5 pr-28 text-[14px] text-gray-900 outline-none transition-all duration-150 placeholder:text-gray-300 focus:border-[#006eff] focus:ring-2 focus:ring-[#006eff]/20 ${
                        registerForm.formState.errors.code ? 'border-[#ff3b30] bg-red-50/30' : 'border-gray-300 bg-white'
                      }`}
                      {...registerForm.register('code')}
                    />
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={codeSending || codeCountdown > 0}
                      className="absolute right-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-[13px] font-medium text-[#0066cc] transition-colors hover:text-[#0052a3] disabled:cursor-not-allowed disabled:text-gray-300"
                    >
                      {codeCountdown > 0 ? `${codeCountdown}s` : codeSending ? 'Sending...' : 'Send code'}
                    </button>
                  </div>
                  {registerForm.formState.errors.code ? (
                    <p className="mt-1.5 text-[12px] text-[#ff3b30]">{registerForm.formState.errors.code.message}</p>
                  ) : null}
                </div>
                <Agreement checked={agreed} onChange={setAgreed} />
                <button
                  type="submit"
                  disabled={registerForm.formState.isSubmitting}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#006eff] py-2.5 text-[14px] font-medium text-white transition-all duration-150 active:scale-[0.99] hover:bg-[#2b7afb] disabled:opacity-40"
                >
                  {registerForm.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Create account
                </button>
              </form>
            )}

            <p className="mt-6 text-center text-[13px] text-gray-400">
              {mode === 'login' ? (
                <>
                  No account yet?{' '}
                  <Link to="/register" className="text-[#0066cc] hover:underline">
                    Register
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <Link to="/login" className="text-[#0066cc] hover:underline">
                    Sign in
                  </Link>
                </>
              )}
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

function Toast({ kind, text }: { kind: 'success' | 'error'; text: string }) {
  return (
    <div
      className={`fixed right-5 top-5 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 ${
        kind === 'success' ? 'bg-green-500' : 'bg-red-500'
      }`}
    >
      {kind === 'success' ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-white" /> : <span className="text-white">!</span>}
      <span className="text-[13px] font-medium text-white">{text}</span>
    </div>
  )
}

function Agreement({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 select-none">
      <input
        type="checkbox"
        className="h-4 w-4 rounded accent-[#006eff]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-[13px] text-gray-500">
        I agree to the
        <a href="#" className="mx-0.5 text-[#0066cc] hover:underline">
          Terms
        </a>
        and
        <a href="#" className="ml-0.5 text-[#0066cc] hover:underline">
          Privacy Policy
        </a>
      </span>
    </label>
  )
}

interface FieldInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const FieldInput = React.forwardRef<HTMLInputElement, FieldInputProps>(({ label, error, ...props }, ref) => (
  <div>
    {label ? <label className="mb-1.5 block text-[13px] font-medium text-gray-600">{label}</label> : null}
    <input
      ref={ref}
      className={`w-full rounded-lg border px-4 py-2.5 text-[14px] text-gray-900 outline-none transition-all duration-150 placeholder:text-gray-300 focus:border-[#006eff] focus:ring-2 focus:ring-[#006eff]/20 ${
        error ? 'border-[#ff3b30] bg-red-50/30' : 'border-gray-300 bg-white'
      }`}
      {...props}
    />
    {error ? <p className="mt-1.5 text-[12px] text-[#ff3b30]">{error}</p> : null}
  </div>
))
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
      {label ? <label className="mb-1.5 block text-[13px] font-medium text-gray-600">{label}</label> : null}
      <div className="relative">
        <input
          ref={ref}
          type={show ? 'text' : 'password'}
          className={`w-full rounded-lg border py-2.5 pl-4 pr-11 text-[14px] text-gray-900 outline-none transition-all duration-150 placeholder:text-gray-300 focus:border-[#006eff] focus:ring-2 focus:ring-[#006eff]/20 ${
            error ? 'border-[#ff3b30] bg-red-50/30' : 'border-gray-300 bg-white'
          }`}
          {...props}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 transition-colors hover:text-gray-500"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error ? <p className="mt-1.5 text-[12px] text-[#ff3b30]">{error}</p> : null}
    </div>
  ),
)
FieldPasswordInput.displayName = 'FieldPasswordInput'
