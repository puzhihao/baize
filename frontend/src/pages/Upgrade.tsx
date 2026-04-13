import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Crown, Loader2, Zap } from 'lucide-react'
import { Logo } from '../components/Logo'
import { authApi, paymentApi } from '../services/api'
import { useAuthStore } from '../store/auth'

type Plan = 'pro_monthly' | 'pro_yearly'
type Step = 'select' | 'pay' | 'done'

const PLANS = [
  {
    id: 'pro_monthly' as Plan,
    label: 'Pro Monthly',
    price: 29,
    unit: 'month',
    badge: '',
    perks: ['Unlimited analyses', 'JD match scoring', 'Rewrite suggestions', 'Priority AI models'],
  },
  {
    id: 'pro_yearly' as Plan,
    label: 'Pro Yearly',
    price: 199,
    unit: 'year',
    badge: 'Save more',
    perks: ['Unlimited analyses', 'JD match scoring', 'Rewrite suggestions', 'Priority AI models', 'Priority support'],
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
      showError(e.response?.data?.error || 'Failed to create order')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmPayment = async () => {
    if (!orderId) return
    setLoading(true)
    try {
      await paymentApi.confirmPayment(orderId)
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
      setStep('done')
    } catch (e: any) {
      showError(e.response?.data?.error || 'Failed to confirm payment')
    } finally {
      setLoading(false)
    }
  }

  const plan = PLANS.find((item) => item.id === selectedPlan)!

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {error ? (
        <div className="fixed right-5 top-5 z-50 flex items-center gap-2.5 rounded-xl bg-red-500 px-4 py-3 shadow-lg">
          <span className="text-white">!</span>
          <span className="text-[13px] font-medium text-white">{error}</span>
        </div>
      ) : null}

      <header className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <Logo variant="light" size="sm" />
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-800">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        {step === 'select' ? (
          <div className="w-full max-w-2xl">
            <div className="mb-10 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[13px] font-medium text-amber-700">
                <Crown className="h-3.5 w-3.5" />
                Upgrade to Pro
              </div>
              <h1 className="text-[28px] font-bold tracking-tight text-gray-900">Unlock the full feature set</h1>
              <p className="mt-2 text-[15px] text-gray-500">Pro gives you unlimited analyses and better matching tools.</p>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {PLANS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedPlan(item.id)}
                  className={`relative rounded-2xl border-2 p-6 text-left transition-all duration-150 ${
                    selectedPlan === item.id ? 'border-[#006eff] bg-blue-50/40 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {item.badge ? (
                    <span className="absolute right-4 top-4 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                      {item.badge}
                    </span>
                  ) : null}
                  <div className="mb-4">
                    <p className="mb-1 text-[13px] font-medium text-gray-500">{item.label}</p>
                    <div className="flex items-end gap-1">
                      <span className="text-[32px] font-bold leading-none text-gray-900">${item.price}</span>
                      <span className="mb-1 text-[13px] text-gray-400">/ {item.unit}</span>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {item.perks.map((perk) => (
                      <li key={perk} className="flex items-center gap-2 text-[13px] text-gray-600">
                        <CheckCircle2 className={`h-3.5 w-3.5 flex-shrink-0 ${selectedPlan === item.id ? 'text-[#006eff]' : 'text-gray-400'}`} />
                        {perk}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>

            <button
              onClick={handleCreateOrder}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#006eff] py-3.5 text-[15px] font-semibold text-white transition-all duration-150 hover:bg-[#2b7afb] active:scale-[0.99] disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Continue with ${plan.price} / {plan.unit}
            </button>
          </div>
        ) : null}

        {step === 'pay' ? (
          <div className="w-full max-w-sm text-center">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="mb-6 inline-flex items-center gap-2 text-[13px] font-medium text-gray-500">
                Order <span className="font-mono text-gray-800">#{orderId}</span>
              </div>

              <div className="mx-auto mb-6 flex h-44 w-44 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-100">
                <Zap className="mb-2 h-8 w-8 text-gray-300" />
                <p className="text-[12px] text-gray-400">Mock payment QR area</p>
              </div>

              <p className="mb-1 text-[22px] font-bold text-gray-900">${plan.price}</p>
              <p className="mb-8 text-[13px] text-gray-400">{plan.label}</p>

              <button
                onClick={handleConfirmPayment}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#006eff] py-3 text-[14px] font-semibold text-white transition-all duration-150 hover:bg-[#2b7afb] active:scale-[0.99] disabled:opacity-40"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                I have completed payment
              </button>

              <button onClick={() => setStep('select')} className="mt-3 w-full py-2 text-[13px] text-gray-400 transition-colors hover:text-gray-600">
                Change plan
              </button>
            </div>
          </div>
        ) : null}

        {step === 'done' ? (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <h2 className="mb-2 text-[24px] font-bold text-gray-900">Upgrade completed</h2>
            <p className="mb-8 text-[15px] text-gray-500">Your account is now on Pro. You can return to the dashboard.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="rounded-xl bg-[#006eff] px-8 py-3 text-[14px] font-semibold text-white transition-all duration-150 hover:bg-[#2b7afb]"
            >
              Go to dashboard
            </button>
          </div>
        ) : null}
      </main>
    </div>
  )
}
