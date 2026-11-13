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

type DemoAccount = {
  userId: string
  role: Role
  title: string
  blurb: string
  path: string
  finds: string
  intents: string[]
}

const DEV_ACCOUNTS: DemoAccount[] = [
  {
    userId: 'u-tax',
    role: 'taxpayer',
    title: 'TC — Tax Client (local)',
    blurb: `Personal ${formatMoney(TC_PERSONAL_FEE)} · Business ${formatMoney(TC_BUSINESS_FEE)}. Local sandbox only.`,
    finds: 'Prepare → Dependents → Savings',
    path: '/app/taxpayer',
    intents: ['taxpayer', 'file', 'start', 'tc'],
  },
  {
    userId: 'u-prep',
    role: 'preparer',
    title: 'TP — Summit Tax (Alex) · local',
    blurb: `Office preparer · ${UNLIMITED_CLIENTS_COPY}.`,
    finds: 'Return / Benefits / Entry',
    path: '/app/preparer',
    intents: ['professional', 'preparer', 'pro', 'tp', 'summit'],
  },
  {
    userId: 'u-prep-solo',
    role: 'preparer',
    title: 'TP — Solo (Taylor Kim) · local',
    blurb: `Upfront ${formatMoney(TP_REGISTRATION_FEE)} · Personal ${formatMoney(TP_PERSONAL_FEE)} · Business ${formatMoney(TP_BUSINESS_FEE)}.`,
    finds: 'Independent TP workspace',
    path: '/app/preparer',
    intents: ['professional', 'preparer', 'pro', 'tp', 'solo'],
  },
  {
    userId: 'u-owner',
    role: 'efin_owner',
    title: 'Office — Summit · local',
    blurb: `EFIN · Subscription ${formatMoney(OFFICE_SUBSCRIPTION_FLOOR)}–${formatMoney(OFFICE_SUBSCRIPTION_HIGH)} · Personal ${formatMoney(OFFICE_PERSONAL_FEE)} · Business ${formatMoney(OFFICE_BUSINESS_FEE)}.`,
    finds: 'Staff, pipeline, pricing',
    path: '/app/office',
    intents: ['office', 'professional', 'pricing', 'efin', 'summit'],
  },
  {
    userId: 'u-owner-lakes',
    role: 'efin_owner',
    title: 'Office — Lakeside · local',
    blurb: `Separate office tenant for isolation testing.`,
    finds: 'Isolated office workspace',
    path: '/app/office',
    intents: ['office', 'professional', 'pricing', 'efin', 'lakeside'],
  },
  {
    userId: 'u-admin',
    role: 'admin',
    title: 'NOVARA administrator · local',
    blurb: 'Subscriptions & flags only.',
    finds: 'Fee Catalog',
    path: '/app/admin',
    intents: ['admin'],
  },
]

/** Local-only role cards. Never statically imported from production Login. */
export function LoginDev() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const intent = (params.get('intent') || '').toLowerCase()
  const nextRaw = params.get('next')
  const next = nextRaw && nextRaw.startsWith('/app/') ? nextRaw : null

  const ordered = useMemo(() => {
    if (!intent) return DEV_ACCOUNTS
    return [...DEV_ACCOUNTS].sort((a, b) => {
      const as = a.intents.includes(intent) ? 1 : 0
      const bs = b.intents.includes(intent) ? 1 : 0
      return bs - as
    })
  }, [intent])

  return (
    <div className="login-page">
      <div className="container login-wrap">
        <div className="login-brand rise">
          <BrandMark size={52} />
          <div>
            <h1 className="brand">NOVARA</h1>
            <p>
              Local development only — role cards are disabled in the published app. Published access uses your Cursor
              sign-in and a single private workspace.
            </p>
          </div>
        </div>
        <div className="role-grid">
          {ordered.map((r, i) => (
            <button
              key={r.userId}
              type="button"
              className={`role-card panel rise rise-delay-${Math.min(i + 1, 3)}`}
              onClick={() => {
                void actions.loginAsDevRole(r.role, r.userId).then(() => {
                  if (intent === 'pricing' && r.role === 'efin_owner') {
                    navigate('/app/fees')
                    return
                  }
                  if (next && r.role === 'taxpayer') {
                    navigate(next)
                    return
                  }
                  navigate(r.path)
                })
              }}
            >
              <strong>{r.title}</strong>
              <span>{r.blurb}</span>
              <em className="role-finds">{r.finds}</em>
            </button>
          ))}
        </div>
        <p className="muted" style={{ margin: 0 }}>
          New here? <Link to="/register">Create a TC, TP, or Office account</Link> (local sandbox)
        </p>
      </div>
    </div>
  )
}
