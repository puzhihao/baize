import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BarChart3, Zap, Target, CheckCircle, ArrowRight, User, LayoutDashboard, LogOut } from 'lucide-react'
import { Logo } from '../components/Logo'
import { useAuthStore } from '../store/auth'

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed')
          obs.disconnect()
        }
      },
      { threshold: 0.12 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

function RevealSection({ children, className = '', delay = 0 }: {
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
    icon: <BarChart3 className="w-6 h-6" />,
    title: '智能评分',
    desc: '从内容完整度、语言表达、结构清晰度等 5 个维度全面评分，精准定位短板。',
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'AI 优化建议',
    desc: '逐条给出改写建议和优化方向，附带改写示例，让表达更专业有力。',
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: 'JD 精准匹配',
    desc: '粘贴目标职位描述，自动分析匹配度，补充缺失关键词，提升通过率。',
  },
]

const plans = [
  {
    name: '免费版',
    price: '¥0',
    period: '永久免费',
    features: ['每月 3 次完整分析', 'AI 评分 + 基础建议', '支持 PDF / DOCX 上传', '修改历史记录'],
    cta: '免费开始',
    href: '/register',
    highlight: false,
  },
  {
    name: '轻享版',
    price: '¥29',
    period: '每月',
    features: ['无限次分析', 'JD 匹配深度分析', '多模型 AI 切换', '流式实时建议输出'],
    cta: '升级 Pro',
    href: '/register',
    highlight: true,
  },
  {
    name: '专业版',
    price: '¥199',
    period: '每月',
    features: ['全部权益', '技术专家 1v1 简历指导', '模拟面试', '面试技巧培训', '大厂内推'],
    cta: '联系我们',
    href: 'mailto:hi@baize.app',
    highlight: false,
  },
]

export default function Landing() {
  const { accessToken, user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [tierCardOpen, setTierCardOpen] = useState(false)

  const isPro = user?.tier === 'pro'
  const FREE_LIMIT = 3
  const analysisUsed = user?.analysis_used ?? 0
  const analysisLimit = isPro ? null : FREE_LIMIT
  const usagePct = analysisLimit ? Math.min(100, Math.round(analysisUsed / analysisLimit * 100)) : 0

  const subEnd = user?.subscription_end
    ? new Date(user.subscription_end).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
    : null

  const handleLogout = () => {
    logout()
    setDropdownOpen(false)
    navigate('/overview')
  }

  return (
    <div className="bg-white text-gray-900 overflow-x-hidden">

      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 h-14 flex items-center justify-between
                      bg-white border-b border-gray-200 shadow-sm pl-[25px] pr-[25px]">
        <Link to="/overview" className="flex items-center flex-shrink-0">
          <Logo variant="light" size="sm" />
        </Link>

        {/* Nav links + Auth — all on the right */}
        <div className="flex items-center">
          <div className="hidden md:flex items-center">
            <a href="#"
              style={{ color: '#16181A', fontSize: '14px', fontFamily: '"PingFang SC", "Helvetica Neue", sans-serif', margin: '0 14px 0 0' }}
              className="hover:text-[#006eff] transition-colors duration-150 whitespace-nowrap">
              价格
            </a>
          </div>
          {/* Tier badge — only when logged in, left of separator */}
          {accessToken && (
            <div className="hidden md:flex items-center mr-3 relative"
                 onMouseEnter={() => setTierCardOpen(true)}
                 onMouseLeave={() => setTierCardOpen(false)}
            >
              <div className="flex items-center">
                <button className="cursor-pointer transition-opacity hover:opacity-80">
                  {isPro ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[12px] font-medium
                                     bg-gradient-to-r from-amber-400 to-orange-400 text-white select-none">
                      专业版
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[12px] font-medium
                                     bg-gray-100 text-gray-500 select-none">
                      免费版
                    </span>
                  )}
                </button>
              </div>

              {/* Tier card dropdown */}
              {tierCardOpen && (
                <div className="absolute right-0 top-full mt-1 w-64 z-20
                                bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.14)]
                                border border-gray-100 overflow-hidden">
                    {/* Card header */}
                    <div className={`px-5 py-4 ${isPro
                      ? 'bg-gradient-to-br from-amber-400 to-orange-400'
                      : 'bg-gradient-to-br from-[#006eff] to-[#2b7afb]'}`}>
                      <p className="text-white font-semibold text-[15px]">
                        {isPro ? '专业版' : '免费版'}
                      </p>
                      {subEnd ? (
                        <p className="text-white/80 text-[12px] mt-0.5">到期时间：{subEnd}</p>
                      ) : (
                        <p className="text-white/80 text-[12px] mt-0.5">永久免费，随时升级</p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="px-5 py-4 space-y-3.5">
                      {/* Analysis usage */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[13px] text-gray-500">分析次数</span>
                          <span className="text-[13px] font-medium text-gray-800">
                            {analysisUsed} / {isPro ? '不限' : FREE_LIMIT}
                          </span>
                        </div>
                        {!isPro && (
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#006eff] to-[#2b7afb] transition-all"
                              style={{ width: `${usagePct}%` }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-gray-500">当前套餐</span>
                        <span className={`text-[12px] font-medium px-2 py-0.5 rounded-full
                                          ${isPro
                                            ? 'bg-amber-50 text-amber-600'
                                            : 'bg-blue-50 text-[#006eff]'}`}>
                          {isPro ? 'Pro' : 'Free'}
                        </span>
                      </div>

                      {isPro && (
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] text-gray-500">JD 匹配</span>
                          <span className="text-[12px] font-medium text-green-600">已开启</span>
                        </div>
                      )}
                    </div>

                    {/* CTA */}
                    {!isPro && (
                      <div className="px-5 pb-4">
                        <Link
                          to="/upgrade"
                          onClick={() => setTierCardOpen(false)}
                          className="block w-full text-center py-2 rounded-lg text-[13px] font-medium
                                     bg-[#006eff] text-white hover:bg-[#2b7afb] transition-colors"
                        >
                          升级专业版
                        </Link>
                      </div>
                    )}
                  </div>
              )}
            </div>
          )}
          <div className="hidden md:block w-px h-4 bg-gray-200 mx-3" />
            {accessToken ? (
              <div
                className="relative"
                onMouseEnter={() => setDropdownOpen(true)}
                onMouseLeave={() => setDropdownOpen(false)}
              >
                <button
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity px-2 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  <span className="w-8 h-8 rounded-full bg-[#e8f3ff] flex items-center justify-center">
                    <User className="w-4 h-4 text-[#006eff]" />
                  </span>
                </button>
                {dropdownOpen && (
                    <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)]
                                    border border-gray-100 overflow-hidden z-10">
                      <div className="px-4 pt-4 pb-3.5 flex flex-col items-center border-b border-gray-100">
                        <span className="w-12 h-12 rounded-full bg-[#e8f3ff] flex items-center justify-center mb-2">
                          <User className="w-6 h-6 text-[#006eff]" />
                        </span>
                        <p className="text-[13px] font-medium text-gray-800 truncate max-w-full">{user?.email ?? '用户'}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{user?.tier === 'pro' ? 'Pro 用户' : '免费用户'}</p>
                      </div>
                      <Link to="/dashboard" onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">
                        <LayoutDashboard className="w-4 h-4 text-gray-400" />
                        用户中心
                      </Link>
                      <button onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-gray-700
                                   hover:bg-gray-50 transition-colors border-t border-gray-100">
                        <LogOut className="w-4 h-4 text-gray-400" />
                        退出登录
                      </button>
                    </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login"
                  style={{ color: '#16181A', fontSize: '14px', fontFamily: '"PingFang SC", "Helvetica Neue", sans-serif', margin: '0 14px 0 0' }}
                  className="hover:text-[#006eff] transition-colors duration-150 whitespace-nowrap">
                  登录
                </Link>
                <Link to="/register"
                  style={{ color: '#FFFFFF', fontSize: '14px', fontFamily: '"PingFang SC", "Helvetica Neue", sans-serif', background: '#006EFF', padding: '0 20px', lineHeight: '32px', borderRadius: '4px', display: 'inline-block' }}
                  className="hover:opacity-90 transition-opacity duration-150 whitespace-nowrap">
                  免费注册
                </Link>
              </>
            )}
          </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-14 min-h-[540px] flex items-center
                           bg-gradient-to-br from-[#e8f3ff] via-[#f0f6ff] to-white overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute right-0 top-0 w-[600px] h-[600px] opacity-30 pointer-events-none"
             style={{ background: 'radial-gradient(circle at 70% 30%, #bfdbff 0%, transparent 60%)' }} />

        <div className="max-w-7xl mx-auto w-full px-6 py-20 hero-enter">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full
                            bg-[#e8f3ff] border border-[#b3d5ff] text-[#006eff] text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#006eff] animate-pulse" />
              AI 驱动的简历优化平台
            </div>

            <h1 className="text-[clamp(36px,5vw,60px)] font-bold tracking-tight leading-[1.1] text-gray-900 mb-5">
              让简历为你
              <br />
              <span className="text-[#006eff]">说话更有力</span>
            </h1>

            <p className="text-[clamp(15px,1.6vw,18px)] text-gray-500 leading-relaxed mb-10 max-w-lg">
              上传简历，30 秒获取专业评分和逐条优化建议。<br />
              针对目标岗位精准匹配，让求职之路更顺畅。
            </p>

            <div className="flex flex-wrap items-center gap-3">
              {accessToken ? (
                <Link to="/dashboard"
                  className="inline-flex items-center gap-2 bg-[#006eff] text-white text-[15px] font-medium
                             px-7 py-3 rounded-md hover:bg-[#2b7afb] transition-colors duration-150
                             shadow-[0_4px_16px_rgba(0,110,255,0.3)]">
                  开始智能分析
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link to="/register"
                    className="inline-flex items-center gap-2 bg-[#006eff] text-white text-[15px] font-medium
                               px-7 py-3 rounded-md hover:bg-[#2b7afb] transition-colors duration-150
                               shadow-[0_4px_16px_rgba(0,110,255,0.3)]">
                    免费开始使用
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link to="/login"
                    className="inline-flex items-center gap-1.5 text-[15px] text-gray-600 border border-gray-300
                               px-7 py-3 rounded-md hover:border-[#006eff] hover:text-[#006eff] transition-colors duration-150">
                    已有账号，登录
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <RevealSection>
        <div className="bg-white border-y border-gray-100 py-8">
          <div className="max-w-4xl mx-auto grid grid-cols-3 divide-x divide-gray-100 px-6">
            {[
              { val: '5 个', label: '评分维度' },
              { val: '30 秒', label: '获取分析结果' },
              { val: '3 大', label: 'AI 模型可选' },
            ].map((s) => (
              <div key={s.label} className="text-center px-8 py-3">
                <div className="text-[28px] font-bold text-[#006eff] mb-1">{s.val}</div>
                <div className="text-[13px] text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </RevealSection>

      {/* ── Features ── */}
      <section className="bg-[#f4f6f9] py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <RevealSection className="text-center mb-14">
            <h2 className="text-[clamp(28px,4vw,44px)] font-bold tracking-tight text-gray-900">
              简历优化的一切，都在这里
            </h2>
            <p className="text-gray-400 mt-3 text-[15px]">专业 AI 能力，帮你在求职竞争中脱颖而出</p>
          </RevealSection>

          <div className="grid md:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <RevealSection key={f.title} delay={i * 80}>
                <div className="bg-white rounded-xl p-7 h-full border border-gray-100
                                shadow-[0_2px_10px_rgba(0,0,0,0.04)]
                                hover:shadow-[0_6px_24px_rgba(0,110,255,0.1)]
                                hover:border-[#b3d5ff] transition-all duration-300 group">
                  <div className="w-11 h-11 rounded-lg bg-[#e8f3ff] flex items-center
                                   justify-center text-[#006eff] mb-5
                                   group-hover:bg-[#006eff] group-hover:text-white transition-colors duration-300">
                    {f.icon}
                  </div>
                  <h3 className="text-[16px] font-semibold text-gray-900 mb-2.5">{f.title}</h3>
                  <p className="text-gray-400 text-[14px] leading-relaxed">{f.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <RevealSection className="text-center mb-14">
            <h2 className="text-[clamp(28px,4vw,44px)] font-bold tracking-tight text-gray-900">
              三步，搞定简历优化
            </h2>
          </RevealSection>

          <div className="space-y-0">
            {[
              { num: '01', title: '上传简历', desc: '支持 PDF、DOCX 格式上传，也可直接粘贴文本或填写表单。' },
              { num: '02', title: 'AI 深度分析', desc: '选择 DeepSeek、GPT-4o 或 Claude，30 秒内完成多维度评分分析。' },
              { num: '03', title: '获取优化建议', desc: '逐条查看 AI 改写建议，对比原文与优化版本，一键了解改进理由。' },
            ].map((step, i) => (
              <RevealSection key={step.num} delay={i * 80}>
                <div className="flex items-start gap-7 py-8 border-b border-gray-100 group
                                hover:bg-[#f8faff] px-5 rounded-xl transition-colors duration-200 -mx-5">
                  <span className="text-[40px] font-bold text-[#e8f3ff] group-hover:text-[#b3d5ff]
                                   transition-colors duration-300 w-14 flex-shrink-0 leading-none mt-1">
                    {step.num}
                  </span>
                  <div className="flex-1">
                    <h3 className="text-[16px] font-semibold text-gray-900 mb-1.5">{step.title}</h3>
                    <p className="text-gray-400 text-[14px] leading-relaxed">{step.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-200 group-hover:text-[#006eff] mt-1.5 flex-shrink-0 transition-colors duration-200" />
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="bg-[#f4f6f9] py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <RevealSection className="text-center mb-14">
            <h2 className="text-[clamp(28px,4vw,44px)] font-bold tracking-tight text-gray-900">
              简单透明，按需选择
            </h2>
          </RevealSection>

          <div className="grid md:grid-cols-3 gap-5">
            {plans.map((p, i) => (
              <RevealSection key={p.name} delay={i * 80}>
                <div className={`relative rounded-xl p-7 h-full flex flex-col border transition-all duration-300
                                 ${p.highlight
                                   ? 'bg-[#006eff] border-[#006eff] shadow-[0_8px_32px_rgba(0,110,255,0.3)] text-white'
                                   : 'bg-white border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_24px_rgba(0,110,255,0.08)] hover:border-[#b3d5ff]'}`}>
                  {p.highlight && (
                    <div className="absolute top-0 right-0">
                      <span className="block bg-amber-500 text-white text-[11px] font-bold tracking-widest uppercase px-4 py-1.5 rounded-bl-xl rounded-tr-xl shadow-md">
                        推荐
                      </span>
                    </div>
                  )}
                  <div className="mb-7">
                    <p className={`text-[13px] font-medium mb-3 ${p.highlight ? 'text-[#b3d5ff]' : 'text-gray-400'}`}>
                      {p.name}
                    </p>
                    <div className="flex items-end gap-1">
                      <span className={`text-[42px] font-bold tracking-tight ${p.highlight ? 'text-white' : 'text-gray-900'}`}>
                        {p.price}
                      </span>
                      <span className={`pb-1.5 text-[13px] ${p.highlight ? 'text-[#b3d5ff]' : 'text-gray-400'}`}>
                        / {p.period}
                      </span>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-[14px]">
                        <CheckCircle className={`w-4 h-4 flex-shrink-0 ${p.highlight ? 'text-[#7fc5ff]' : 'text-[#006eff]'}`} />
                        <span className={p.highlight ? 'text-white/90' : 'text-gray-500'}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to={p.href}
                    className={`w-full text-center py-2.5 rounded-md text-[14px] font-medium
                                transition-all duration-150
                                ${p.highlight
                                  ? 'bg-white text-[#006eff] hover:bg-[#f0f6ff]'
                                  : 'bg-[#006eff] text-white hover:bg-[#2b7afb]'}`}>
                    {p.cta}
                  </Link>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <RevealSection>
        <section className="bg-[#006eff] py-20 px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-[clamp(26px,4vw,40px)] font-bold text-white mb-4 tracking-tight">
              开始你的求职优化之旅
            </h2>
            <p className="text-[#b3d5ff] text-[16px] mb-8">免费注册，立享 3 次完整 AI 分析体验</p>
            <Link to="/register"
              className="inline-flex items-center gap-2 bg-white text-[#006eff] font-semibold
                         text-[15px] px-8 py-3 rounded-md hover:bg-[#f0f6ff]
                         transition-colors duration-150 shadow-[0_4px_16px_rgba(0,0,0,0.15)]">
              立即免费注册
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </RevealSection>

      {/* ── Footer ── */}
      <footer className="bg-[#f4f6f9] border-t border-gray-200 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center
                        justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo variant="light" size="md" />
          </div>
          <p className="text-[12px] text-gray-400">© 2026 Baize. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/login" className="text-[12px] text-gray-400 hover:text-[#006eff] transition-colors">登录</Link>
            <Link to="/register" className="text-[12px] text-gray-400 hover:text-[#006eff] transition-colors">注册</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
