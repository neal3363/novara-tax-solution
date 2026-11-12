import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { actions } from '../store/useAppStore'
import type { Role } from '../data/types'
import './Login.css'

const ROLES: { role: Role; title: string; blurb: string; path: string; finds: string; intents: string[] }[] = [
  {
    role: 'taxpayer',
    title: 'Direct taxpayer',
    blurb: 'Start filing with document upload and the AI Smart Tax Interview.',
    finds: 'Prepare → Savings → Refund Opportunity Tracker',
    path: '/app/taxpayer',
    intents: ['taxpayer', 'file', 'start'],
  },
  {
    role: 'preparer',
    title: 'Tax preparer (TP)',
    blurb: 'Return editor, Benefits engine, Filed-style Entry plan, live queue.',
    finds: 'Use Return / Benefits / Entry tabs',
    path: '/app/preparer',
    intents: ['professional', 'preparer', 'pro'],
  },
  {
    role: 'efin_owner',
    title: 'EFIN office owner',
    blurb: 'Office dashboard, pipeline, staff, and professional pricing transparency.',
    finds: 'Open Pricing for $899 floor, calculator, and FAQ',
    path: '/app/office',
    intents: ['office', 'professional', 'pricing', 'efin'],
  },
  {
    role: 'admin',
    title: 'Platform admin',
    blurb: 'Tenants, fee catalog, feature flags, system health.',
    finds: 'Fee Catalog includes approved vs provisional terms',
    path: '/app/admin',
    intents: ['admin'],
  },
]

export function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const intent = (params.get('intent') || '').toLowerCase()

  const ordered = useMemo(() => {
    if (!intent) return ROLES
    if (intent === 'pricing') {
      return [...ROLES].sort((a, b) => Number(b.role === 'efin_owner') - Number(a.role === 'efin_owner'))
    }
    return [...ROLES].sort((a, b) => {
      const as = a.intents.includes(intent) ? 1 : 0
      const bs = b.intents.includes(intent) ? 1 : 0
      return bs - as
    })
  }, [intent])

  const heading =
    intent === 'taxpayer' || intent === 'file' || intent === 'start'
      ? 'Start your tax return'
      : intent === 'office' || intent === 'pricing'
        ? 'Open your tax office'
        : intent === 'professional' || intent === 'preparer' || intent === 'pro'
          ? 'Continue as a tax professional'
          : 'Choose a demo role'

  return (
    <div className="login-page">
      <div className="container login-wrap">
        <div className="login-brand rise">
          <BrandMark size={52} />
          <div>
            <h1 className="brand">NOVARA</h1>
            <p>
              {heading}. Sample data only — session storage on this device. Existing dashboards open after you pick a
              role.
            </p>
          </div>
        </div>
        <div className="role-grid">
          {ordered.map((r, i) => (
            <button
              key={r.role}
              type="button"
              className={`role-card panel rise rise-delay-${Math.min(i + 1, 3)} ${
                intent && r.intents.includes(intent) ? 'suggested' : ''
              }`}
              onClick={() => {
                actions.loginAs(r.role)
                navigate(intent === 'pricing' && r.role === 'efin_owner' ? '/app/fees' : r.path)
              }}
            >
              <strong>{r.title}</strong>
              <span>{r.blurb}</span>
              <em className="role-finds">{r.finds}</em>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
