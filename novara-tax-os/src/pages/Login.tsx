import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { actions } from '../store/useAppStore'
import type { Role } from '../data/types'
import {
  OFFICE_BUSINESS_FEE,
  OFFICE_PERSONAL_FEE,
  OFFICE_SUBSCRIPTION_FLOOR,
  OFFICE_SUBSCRIPTION_HIGH,
  TC_BUSINESS_FEE,
  TC_PERSONAL_FEE,
  TP_BUSINESS_FEE,
  TP_PERSONAL_FEE,
  TP_REGISTRATION_FEE,
  UNLIMITED_CLIENTS_COPY,
  formatMoney,
} from '../data/fees'
import './Login.css'

const ROLES: {
  role: Role
  title: string
  blurb: string
  path: string
  finds: string
  intents: string[]
}[] = [
  {
    role: 'taxpayer',
    title: 'TC — Tax Client',
    blurb: `Personal ${formatMoney(TC_PERSONAL_FEE)} · Business ${formatMoney(TC_BUSINESS_FEE)}. AI interview, dependents, and auto-applied benefits.`,
    finds: 'Prepare → Dependents → Savings',
    path: '/app/taxpayer',
    intents: ['taxpayer', 'file', 'start', 'tc'],
  },
  {
    role: 'preparer',
    title: 'TP — Tax Preparer',
    blurb: `Upfront ${formatMoney(TP_REGISTRATION_FEE)} · Personal ${formatMoney(TP_PERSONAL_FEE)} · Business ${formatMoney(TP_BUSINESS_FEE)}. ${UNLIMITED_CLIENTS_COPY}.`,
    finds: 'Return / Benefits / Entry',
    path: '/app/preparer',
    intents: ['professional', 'preparer', 'pro', 'tp'],
  },
  {
    role: 'efin_owner',
    title: 'Office — Tax Office',
    blurb: `Subscription ${formatMoney(OFFICE_SUBSCRIPTION_FLOOR)}–${formatMoney(OFFICE_SUBSCRIPTION_HIGH)} · Personal ${formatMoney(OFFICE_PERSONAL_FEE)} · Business ${formatMoney(OFFICE_BUSINESS_FEE)}. ${UNLIMITED_CLIENTS_COPY}.`,
    finds: 'Staff, pipeline, pricing',
    path: '/app/office',
    intents: ['office', 'professional', 'pricing', 'efin'],
  },
  {
    role: 'admin',
    title: 'NOVARA administrator',
    blurb: 'Tenants, fee catalog, feature flags, audited platform access.',
    finds: 'Fee Catalog mirrors centralized pricing',
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
    intent === 'taxpayer' || intent === 'file' || intent === 'start' || intent === 'tc'
      ? 'TC — start your tax return'
      : intent === 'office' || intent === 'pricing'
        ? 'Office — open your tax office'
        : intent === 'professional' || intent === 'preparer' || intent === 'pro' || intent === 'tp'
          ? 'TP — continue as a tax preparer'
          : 'Sign in or choose a demo role'

  return (
    <div className="login-page">
      <div className="container login-wrap">
        <div className="login-brand rise">
          <BrandMark size={52} />
          <div>
            <h1 className="brand">NOVARA</h1>
            <p>
              {heading}. Demo roles only — session access in this browser. Prefer the{' '}
              <Link to="/register">registration</Link> flow for tier pricing and test-mode checkout.
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
        <p className="muted" style={{ margin: 0 }}>
          New here? <Link to="/register">Create a TC, TP, or Office account</Link>
        </p>
      </div>
    </div>
  )
}
