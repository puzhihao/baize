import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Loader2, ArrowLeft, Zap, Crown } from 'lucide-react'
import { paymentApi, authApi } from '../services/api'
import { useAuthStore } from '../store/auth'
import { Logo } from '../components/Logo'

type Plan = 'pro_monthly' | 'pro_yearly'
type Step = 'select' | 'pay' | 'done'

const PLANS = [
  {
    id: 'pro_monthly' as Plan,
    label: '专业版月付',
    price: 29,
    unit: '月',
    badge: '',
    perks: ['无限次简历分析', 'JD 匹配分析', '逐条优化建议', '优先 AI 模型'],
  },
  {
    id: 'pro_yearly' as Plan,
    label: '专业版年付',
    price: 199,
    unit: '年',
    badge: '省 ¥149',
    perks: ['无限次简历分析', 'JD 匹配分析', '逐条优化建议', '优先 AI 模型', '专属客服支持'],
  },
]

export default function Upgrade() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const [selectedPlan, setSelectedPlan] = useState<Plan>('pro_yearly')
  const [step, setStep] = useState<Step>('select')
  const [orderId, setOrderId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const showError = (msg: string) => {
    setError(msg)
    setTimeout(() => setError(''), 4000)
  }

  const handleCreateOrder = async () => {
    setLoading(true)
    try {
      const { data } = await paymentApi.createOrder(selectedPlan)
      setOrderId(data.id)
      setStep('pay')
    } catch (e: any) {
      showError(e.response?.data?.error || '创建订单失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmPayment = async () => {
    if (!orderId) return
    setLoading(true)
    try {
      await paymentApi.confirmPayment(orderId)
      // Refresh user info
      const { data: me } = await authApi.me()
      setUser({
        id: me.user_id,
        email: me.email,
        username: me.username,
        tier: me.tier,
        is_admin: me.is_admin,
        analysis_used: me.analysis_used,
        monthly_quota_used: me.monthly_quota_used,
        subscription_end: me.subscription_end,
        created_at: me.created_at,
      })
      setStep('done')
    } catch (e: any) {
      showError(e.response?.data?.error || '确认支付失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const plan = PLANS.find(p => p.id === selectedPlan)!

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Error toast */}
      {error && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5
                        bg-red-500 shadow-lg rounded-xl px-4 py-3
                        animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="w-4 h-4 flex-shrink-0 text-white text-base leading-none">✕</span>
          <span className="text-[13px] text-white font-medium">{error}</span>
        </div>
      )}

      {/* Nav */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Logo variant="light" size="sm" />
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {step === 'select' && (
          <div className="w-full max-w-2xl">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 text-[13px] font-medium px-3 py-1.5 rounded-full border border-amber-200 mb-4">
                <Crown className="w-3.5 h-3.5" />
                升级专业版
              </div>
              <h1 className="text-[28px] font-bold text-gray-900 tracking-tight">解锁全部功能</h1>
              <p className="text-gray-500 text-[15px] mt-2">专业版提供无限次分析，助你轻松拿下心仪 offer</p>
            </div>

            {/* Plan cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {PLANS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  className={`relative text-left rounded-2xl border-2 p-6 transition-all duration-150 outline-none
                    ${selectedPlan === p.id
                      ? 'border-[#006eff] bg-blue-50/40 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                >
                  {p.badge && (
                    <span className="absolute top-4 right-4 text-[11px] font-semibold text-white bg-amber-500 px-2 py-0.5 rounded-full">
                      {p.badge}
                    </span>
                  )}
                  <div className="mb-4">
                    <p className="text-[13px] text-gray-500 font-medium mb-1">{p.label}</p>
                    <div className="flex items-end gap-1">
                      <span className="text-[32px] font-bold text-gray-900 leading-none">¥{p.price}</span>
                      <span className="text-gray-400 text-[13px] mb-1">/ {p.unit}</span>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {p.perks.map(perk => (
                      <li key={perk} className="flex items-center gap-2 text-[13px] text-gray-600">
                        <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 ${selectedPlan === p.id ? 'text-[#006eff]' : 'text-gray-400'}`} />
                        {perk}
                      </li>
                    ))}
                  </ul>
                  {selectedPlan === p.id && (
                    <div className="absolute bottom-4 right-4 w-5 h-5 rounded-full bg-[#006eff] flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={handleCreateOrder}
              disabled={loading}
              className="w-full bg-[#006eff] text-white font-semibold text-[15px] py-3.5 rounded-xl
                         hover:bg-[#2b7afb] active:scale-[0.99] transition-all duration-150
                         disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              立即升级 — ¥{plan.price} / {plan.unit}
            </button>
          </div>
        )}

        {step === 'pay' && (
          <div className="w-full max-w-sm text-center">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <div className="inline-flex items-center gap-2 text-[13px] font-medium text-gray-500 mb-6">
                订单编号 <span className="font-mono text-gray-800">#{orderId}</span>
              </div>

              {/* Fake QR code placeholder */}
              <div className="mx-auto w-44 h-44 bg-gray-100 rounded-xl flex flex-col items-center justify-center mb-6 border border-dashed border-gray-300">
                <Zap className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-[12px] text-gray-400">微信 / 支付宝扫码支付</p>
              </div>

              <p className="text-[22px] font-bold text-gray-900 mb-1">¥{plan.price}</p>
              <p className="text-[13px] text-gray-400 mb-8">{plan.label}</p>

              <button
                onClick={handleConfirmPayment}
                disabled={loading}
                className="w-full bg-[#006eff] text-white font-semibold text-[14px] py-3 rounded-xl
                           hover:bg-[#2b7afb] active:scale-[0.99] transition-all duration-150
                           disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                我已完成支付
              </button>

              <button
                onClick={() => setStep('select')}
                className="mt-3 w-full text-[13px] text-gray-400 hover:text-gray-600 transition-colors py-2"
              >
                返回修改
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-[24px] font-bold text-gray-900 mb-2">升级成功！</h2>
            <p className="text-gray-500 text-[15px] mb-8">你已成为专业版用户，立即开始无限次简历分析吧</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-[#006eff] text-white font-semibold text-[14px] px-8 py-3 rounded-xl
                         hover:bg-[#2b7afb] transition-all duration-150"
            >
              前往工作台
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
