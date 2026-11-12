import { useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { actions } from '../store/useAppStore'
import type { Role } from '../data/types'
import './Login.css'

const ROLES: { role: Role; title: string; blurb: string; path: string; finds: string }[] = [
  {
    role: 'taxpayer',
    title: 'Direct taxpayer',
    blurb: 'Home shows Refund Opportunity Tracker + tax-savings summary.',
    finds: 'Open Savings for Benefit Optimization Engine',
    path: '/app/taxpayer',
  },
  {
    role: 'preparer',
    title: 'Tax preparer (TP)',
    blurb: 'Return editor, Benefits engine, Filed-style Entry plan, live queue.',
    finds: 'Use Return / Benefits / Entry tabs',
    path: '/app/preparer',
  },
  {
    role: 'efin_owner',
    title: 'EFIN office owner',
    blurb: 'Pipeline is status-only. Pricing has $899, calculator, and FAQ.',
    finds: 'Open Pricing for transparency page',
    path: '/app/office',
  },
  {
    role: 'admin',
    title: 'Platform admin',
    blurb: 'Tenants, fee catalog, feature flags, system health.',
    finds: 'Fee Catalog includes approved vs provisional terms',
    path: '/app/admin',
  },
]

export function Login() {
  const navigate = useNavigate()

  return (
    <div className="login-page">
      <div className="container login-wrap">
        <div className="login-brand rise">
          <BrandMark size={52} />
          <div>
            <h1 className="brand">NOVARA</h1>
            <p>
              Choose a demo role to see the latest updates. Sample data only — session storage on this device.
            </p>
          </div>
        </div>
        <div className="role-grid">
          {ROLES.map((r, i) => (
            <button
              key={r.role}
              type="button"
              className={`role-card panel rise rise-delay-${Math.min(i + 1, 3)}`}
              onClick={() => {
                actions.loginAs(r.role)
                navigate(r.path)
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
