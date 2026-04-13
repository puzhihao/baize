import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  CheckCircle,
  LayoutDashboard,
  LogOut,
  Target,
  User,
  Zap,
} from 'lucide-react'
import { Logo } from '../components/Logo'
import { useAuthStore } from '../store/auth'

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        element.classList.add('revealed')
        observer.disconnect()
      }
    }, { threshold: 0.12 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return ref
}

function RevealSection({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = useScrollReveal()
  return (
    <div ref={ref} className={`reveal-section ${className}`} style={{ '--delay': `${delay}ms` } as React.CSSProperties}>
      {children}
    </div>
  )
}

const features = [
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: 'Structured scoring',
    desc: 'Score resumes across content, language, structure, keywords, and measurable impact.',
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: 'Rewrite suggestions',
    desc: 'Get direct suggestions that turn vague statements into stronger, more credible resume lines.',
  },
  {
    icon: <Target className="h-6 w-6" />,
    title: 'JD matching',
    desc: 'Compare a resume against the target job description and identify missing keywords and positioning gaps.',
  },
]

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: ['3 analyses per month', 'Core AI scoring', 'PDF and DOCX upload', 'History tracking'],
    cta: 'Start free',
    href: '/register',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: 'month',
    features: ['Unlimited analyses', 'JD matching', 'Advanced model selection', 'Priority support'],
    cta: 'Upgrade to Pro',
    href: '/register',
    highlight: true,
  },
  {
    name: 'Max',
    price: '$199',
    period: 'month',
    features: ['Everything in Pro', '1:1 manual review', 'Interview simulation', 'Career consultation'],
    cta: 'Contact us',
    href: 'mailto:hi@baize.app',
    highlight: false,
  },
]

export default function Landing() {
  const { accessToken, user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleLogout = () => {
    logout()
    setDropdownOpen(false)
    navigate('/overview')
  }

  return (
    <div className="overflow-x-hidden bg-white text-gray-900">
      <nav className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-[25px] shadow-sm">
        <Link to="/overview" className="flex flex-shrink-0 items-center">
          <Logo variant="light" size="sm" />
        </Link>

        <div className="flex items-center">
          <div className="hidden items-center md:flex">
            <a
              href="#pricing"
              className="mr-[14px] whitespace-nowrap text-[14px] text-[#16181A] transition-colors duration-150 hover:text-[#006eff]"
            >
              Pricing
            </a>
          </div>

          <div className="mx-3 hidden h-4 w-px bg-gray-200 md:block" />

          {accessToken ? (
            <div
              className="relative"
              onMouseEnter={() => setDropdownOpen(true)}
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <button className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-opacity hover:bg-gray-50 hover:opacity-80">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8f3ff]">
                  <User className="h-4 w-4 text-[#006eff]" />
                </span>
              </button>

              {dropdownOpen ? (
                <div className="absolute right-0 z-10 mt-1.5 w-52 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                  <div className="flex flex-col items-center border-b border-gray-100 px-4 pb-3.5 pt-4">
                    <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#e8f3ff]">
                      <User className="h-6 w-6 text-[#006eff]" />
                    </span>
                    <p className="max-w-full truncate text-[13px] font-medium text-gray-800">{user?.email ?? 'User'}</p>
                    <p className="mt-0.5 text-[11px] text-gray-400">{user?.tier === 'pro' ? 'Pro user' : 'Free user'}</p>
                  </div>
                  <Link
                    to="/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <LayoutDashboard className="h-4 w-4 text-gray-400" />
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 border-t border-gray-100 px-4 py-2.5 text-[13px] text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <LogOut className="h-4 w-4 text-gray-400" />
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="mr-[14px] whitespace-nowrap text-[14px] text-[#16181A] transition-colors duration-150 hover:text-[#006eff]"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="inline-block whitespace-nowrap rounded-[4px] bg-[#006EFF] px-5 leading-8 text-[14px] text-white transition-opacity duration-150 hover:opacity-90"
              >
                Register free
              </Link>
            </>
          )}
        </div>
      </nav>

      <section className="relative flex min-h-[540px] items-center overflow-hidden bg-gradient-to-br from-[#e8f3ff] via-[#f0f6ff] to-white pt-14">
        <div
          className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] opacity-30"
          style={{ background: 'radial-gradient(circle at 70% 30%, #bfdbff 0%, transparent 60%)' }}
        />

        <div className="hero-enter mx-auto w-full max-w-7xl px-6 py-20">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#b3d5ff] bg-[#e8f3ff] px-3 py-1 text-xs font-medium text-[#006eff]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#006eff]" />
              AI-powered resume review
            </div>

            <h1 className="mb-5 text-[clamp(36px,5vw,60px)] font-bold leading-[1.1] tracking-tight text-gray-900">
              Make your resume
              <br />
              <span className="text-[#006eff]">say more with less</span>
            </h1>

            <p className="mb-10 max-w-lg text-[clamp(15px,1.6vw,18px)] leading-relaxed text-gray-500">
              Upload a resume and get a fast, practical review with scoring, rewrite suggestions, and job-description matching.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-md bg-[#006eff] px-7 py-3 text-[15px] font-medium text-white shadow-[0_4px_16px_rgba(0,110,255,0.3)] transition-colors duration-150 hover:bg-[#2b7afb]"
              >
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-7 py-3 text-[15px] text-gray-600 transition-colors duration-150 hover:border-[#006eff] hover:text-[#006eff]"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      <RevealSection>
        <div className="border-y border-gray-100 bg-white py-8">
          <div className="mx-auto grid max-w-4xl grid-cols-3 divide-x divide-gray-100 px-6">
            {[
              { val: '5', label: 'scoring dimensions' },
              { val: '30s', label: 'to get first feedback' },
              { val: '3', label: 'AI models available' },
            ].map((stat) => (
              <div key={stat.label} className="px-8 py-3 text-center">
                <div className="mb-1 text-[28px] font-bold text-[#006eff]">{stat.val}</div>
                <div className="text-[13px] text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </RevealSection>

      <section className="bg-[#f4f6f9] px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <RevealSection className="mb-14 text-center">
            <h2 className="text-[clamp(28px,4vw,44px)] font-bold tracking-tight text-gray-900">Everything you need to improve a resume</h2>
            <p className="mt-3 text-[15px] text-gray-400">Built for focused feedback, not vague AI summaries.</p>
          </RevealSection>

          <div className="grid gap-5 md:grid-cols-3">
            {features.map((feature, index) => (
              <RevealSection key={feature.title} delay={index * 80}>
                <div className="group h-full rounded-xl border border-gray-100 bg-white p-7 shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all duration-300 hover:border-[#b3d5ff] hover:shadow-[0_6px_24px_rgba(0,110,255,0.1)]">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-[#e8f3ff] text-[#006eff] transition-colors duration-300 group-hover:bg-[#006eff] group-hover:text-white">
                    {feature.icon}
                  </div>
                  <h3 className="mb-2.5 text-[16px] font-semibold text-gray-900">{feature.title}</h3>
                  <p className="text-[14px] leading-relaxed text-gray-400">{feature.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <RevealSection className="mb-14 text-center">
            <h2 className="text-[clamp(28px,4vw,44px)] font-bold tracking-tight text-gray-900">Three steps to a better resume</h2>
          </RevealSection>

          <div className="space-y-0">
            {[
              { num: '01', title: 'Upload your resume', desc: 'Use PDF, DOCX, pasted text, or a simple form.' },
              { num: '02', title: 'Run AI analysis', desc: 'Choose a model and generate structured feedback in seconds.' },
              { num: '03', title: 'Apply the suggestions', desc: 'Review stronger wording, missing keywords, and improvement reasons.' },
            ].map((step, index) => (
              <RevealSection key={step.num} delay={index * 80}>
                <div className="-mx-5 flex items-start gap-7 rounded-xl border-b border-gray-100 px-5 py-8 transition-colors duration-200 hover:bg-[#f8faff]">
                  <span className="mt-1 w-14 flex-shrink-0 text-[40px] font-bold leading-none text-[#e8f3ff]">{step.num}</span>
                  <div className="flex-1">
                    <h3 className="mb-1.5 text-[16px] font-semibold text-gray-900">{step.title}</h3>
                    <p className="text-[14px] leading-relaxed text-gray-400">{step.desc}</p>
                  </div>
                  <ArrowRight className="mt-1.5 h-4 w-4 flex-shrink-0 text-gray-200" />
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-[#f4f6f9] px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <RevealSection className="mb-14 text-center">
            <h2 className="text-[clamp(28px,4vw,44px)] font-bold tracking-tight text-gray-900">Simple pricing</h2>
            <p className="mt-3 text-[15px] text-gray-400">Choose the plan that matches your search intensity.</p>
          </RevealSection>

          <div className="grid gap-5 md:grid-cols-3">
            {plans.map((plan, index) => (
              <RevealSection key={plan.name} delay={index * 80}>
                <div
                  className={`flex h-full flex-col rounded-xl border p-7 transition-all duration-300 ${
                    plan.highlight
                      ? 'border-[#006eff] bg-[#006eff] text-white shadow-[0_8px_32px_rgba(0,110,255,0.3)]'
                      : 'border-gray-100 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:border-[#b3d5ff] hover:shadow-[0_6px_24px_rgba(0,110,255,0.08)]'
                  }`}
                >
                  {plan.highlight ? <div className="mb-4 text-[11px] font-bold uppercase tracking-widest text-[#b3d5ff]">Recommended</div> : null}
                  <div className="mb-7">
                    <p className={`mb-3 text-[13px] font-medium ${plan.highlight ? 'text-[#b3d5ff]' : 'text-gray-400'}`}>{plan.name}</p>
                    <div className="flex items-end gap-1">
                      <span className={`text-[42px] font-bold tracking-tight ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                      <span className={`pb-1.5 text-[13px] ${plan.highlight ? 'text-[#b3d5ff]' : 'text-gray-400'}`}>/ {plan.period}</span>
                    </div>
                  </div>
                  <ul className="mb-8 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2.5 text-[14px]">
                        <CheckCircle className={`h-4 w-4 flex-shrink-0 ${plan.highlight ? 'text-[#7fc5ff]' : 'text-[#006eff]'}`} />
                        <span className={plan.highlight ? 'text-white/90' : 'text-gray-500'}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={plan.href}
                    className={`w-full rounded-md py-2.5 text-center text-[14px] font-medium transition-all duration-150 ${
                      plan.highlight ? 'bg-white text-[#006eff] hover:bg-[#f0f6ff]' : 'bg-[#006eff] text-white hover:bg-[#2b7afb]'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      <RevealSection>
        <section className="bg-[#006eff] px-6 py-20 text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-4 text-[clamp(26px,4vw,40px)] font-bold tracking-tight text-white">Start improving your resume today</h2>
            <p className="mb-8 text-[16px] text-[#b3d5ff]">Register free and get your first AI analysis in minutes.</p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-md bg-white px-8 py-3 text-[15px] font-semibold text-[#006eff] shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition-colors duration-150 hover:bg-[#f0f6ff]"
            >
              Register free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </RevealSection>

      <footer className="border-t border-gray-200 bg-[#f4f6f9] px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo variant="light" size="md" />
          </div>
          <p className="text-[12px] text-gray-400">&copy; 2026 Baize. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/login" className="text-[12px] text-gray-400 transition-colors hover:text-[#006eff]">
              Sign in
            </Link>
            <Link to="/register" className="text-[12px] text-gray-400 transition-colors hover:text-[#006eff]">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
