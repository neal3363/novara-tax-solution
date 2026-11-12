import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { DEMO_USERS } from '../data/seed'
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

type DemoAccount = {
  userId: string
  role: Role
  title: string
  blurb: string
  path: string
  finds: string
  intents: string[]
}

const ACCOUNTS: DemoAccount[] = [
  {
    userId: 'u-tax',
    role: 'taxpayer',
    title: 'TC — Tax Client',
    blurb: `Personal ${formatMoney(TC_PERSONAL_FEE)} · Business ${formatMoney(TC_BUSINESS_FEE)}. Private vault for this engagement only.`,
    finds: 'Prepare → Dependents → Savings',
    path: '/app/taxpayer',
    intents: ['taxpayer', 'file', 'start', 'tc'],
  },
  {
    userId: 'u-prep',
    role: 'preparer',
    title: 'TP — Summit Tax (Alex)',
    blurb: `Office staff login · ${UNLIMITED_CLIENTS_COPY}. Isolated Summit tenant only.`,
    finds: 'Return / Benefits / Entry',
    path: '/app/preparer',
    intents: ['professional', 'preparer', 'pro', 'tp', 'summit'],
  },
  {
    userId: 'u-prep-solo',
    role: 'preparer',
    title: 'TP — Solo preparer (Taylor Kim)',
    blurb: `Upfront ${formatMoney(TP_REGISTRATION_FEE)} · Personal ${formatMoney(TP_PERSONAL_FEE)} · Business ${formatMoney(TP_BUSINESS_FEE)}. ${UNLIMITED_CLIENTS_COPY}. Private client database.`,
    finds: 'Independent TP workspace',
    path: '/app/preparer',
    intents: ['professional', 'preparer', 'pro', 'tp', 'solo'],
  },
  {
    userId: 'u-owner',
    role: 'efin_owner',
    title: 'Office — Summit Tax',
    blurb: `Subscription ${formatMoney(OFFICE_SUBSCRIPTION_FLOOR)}–${formatMoney(OFFICE_SUBSCRIPTION_HIGH)} · Personal ${formatMoney(OFFICE_PERSONAL_FEE)} · Business ${formatMoney(OFFICE_BUSINESS_FEE)}. ${UNLIMITED_CLIENTS_COPY}.`,
    finds: 'Staff, pipeline, pricing',
    path: '/app/office',
    intents: ['office', 'professional', 'pricing', 'efin', 'summit'],
  },
  {
    userId: 'u-owner-lakes',
    role: 'efin_owner',
    title: 'Office — Lakeside Tax',
    blurb: `Separate office tenant · ${UNLIMITED_CLIENTS_COPY}. Cannot see Summit clients or vault files.`,
    finds: 'Isolated office workspace',
    path: '/app/office',
    intents: ['office', 'professional', 'pricing', 'efin', 'lakeside'],
  },
  {
    userId: 'u-admin',
    role: 'admin',
    title: 'NOVARA administrator',
    blurb: 'Subscriptions & flags only — no default access to taxpayer documents.',
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
    if (!intent) return ACCOUNTS
    if (intent === 'pricing') {
      return [...ACCOUNTS].sort((a, b) => Number(b.role === 'efin_owner') - Number(a.role === 'efin_owner'))
    }
    return [...ACCOUNTS].sort((a, b) => {
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
              {heading}. Each demo account is a separate tenant — clients, returns, and vault files never cross. Prefer the{' '}
              <Link to="/register">registration</Link> flow for tier pricing and test-mode checkout.
            </p>
          </div>
        </div>
        <div className="role-grid">
          {ordered.map((r, i) => {
            const user = DEMO_USERS.find((u) => u.id === r.userId)
            return (
              <button
                key={r.userId}
                type="button"
                className={`role-card panel rise rise-delay-${Math.min(i + 1, 3)} ${
                  intent && r.intents.includes(intent) ? 'suggested' : ''
                }`}
                onClick={() => {
                  actions.loginAs(r.role, r.userId)
                  navigate(intent === 'pricing' && r.role === 'efin_owner' ? '/app/fees' : r.path)
                }}
              >
                <strong>{r.title}</strong>
                <span>{r.blurb}</span>
                <em className="role-finds">
                  {r.finds}
                  {user ? ` · ${user.tenantId}` : ''}
                </em>
              </button>
            )
          })}
        </div>
        <p className="muted" style={{ margin: 0 }}>
          New here? <Link to="/register">Create a TC, TP, or Office account</Link>
        </p>
      </div>
    </div>
  )
}
