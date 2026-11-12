import { useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { actions } from '../store/useAppStore'
import type { Role } from '../data/types'
import './Login.css'

const ROLES: { role: Role; title: string; blurb: string; path: string }[] = [
  {
    role: 'taxpayer',
    title: 'Direct taxpayer',
    blurb: 'Upload documents, answer smart questions, review, sign.',
    path: '/app/taxpayer',
  },
  {
    role: 'preparer',
    title: 'Tax preparer (TP)',
    blurb: 'Review drafted returns, verify extractions, escalate, file.',
    path: '/app/preparer',
  },
  {
    role: 'efin_owner',
    title: 'EFIN office owner',
    blurb: 'Pipeline, staff, pricing, billing, and office AI.',
    path: '/app/office',
  },
  {
    role: 'admin',
    title: 'Platform admin',
    blurb: 'Tenants, fee catalog, feature flags, system health.',
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
            <p>Choose a demo role. Everything saves locally on this computer.</p>
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
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
