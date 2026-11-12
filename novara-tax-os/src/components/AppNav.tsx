import { Link, NavLink, useNavigate } from 'react-router-dom'
import { BrandMark } from './BrandMark'
import { actions, useAppStore } from '../store/useAppStore'
import './AppNav.css'

const roleHome: Record<string, string> = {
  taxpayer: '/app/taxpayer',
  preparer: '/app/preparer',
  efin_owner: '/app/office',
  admin: '/app/admin',
}

export function AppNav() {
  const { currentUser } = useAppStore()
  const navigate = useNavigate()

  if (!currentUser) return null

  const home = roleHome[currentUser.role]

  const links =
    currentUser.role === 'taxpayer'
      ? [
          { to: '/app/taxpayer', label: 'Home' },
          { to: '/app/taxpayer/prepare', label: 'Prepare' },
          { to: '/app/taxpayer/benefits', label: 'Savings' },
          { to: '/app/taxpayer/documents', label: 'Documents' },
          { to: '/app/taxpayer/vault', label: 'Vault' },
        ]
      : currentUser.role === 'preparer'
        ? [
            { to: '/app/preparer', label: 'Inbox' },
            { to: '/app/preparer/return', label: 'Return' },
            { to: '/app/preparer/benefits', label: 'Benefits' },
            { to: '/app/preparer/entry-plan', label: 'Entry' },
          ]
        : currentUser.role === 'efin_owner'
          ? [
              { to: '/app/office', label: 'Office' },
              { to: '/app/office/staff', label: 'Staff' },
              { to: '/app/office/pipeline', label: 'Pipeline' },
              { to: '/app/fees', label: 'Pricing' },
            ]
          : [
              { to: '/app/admin', label: 'Platform' },
              { to: '/app/fees', label: 'Fee Catalog' },
              { to: '/app/admin/tenants', label: 'Tenants' },
            ]

  return (
    <>
      <header className="top-nav">
        <div className="top-nav-inner">
          <Link to={home} className="top-brand">
            <BrandMark size={32} />
            <div>
              <strong className="brand">NOVARA</strong>
              <span>Tax OS</span>
            </div>
          </Link>
          <nav className="top-links desktop-only">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === home}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="top-user">
            <div className="user-chip">
              <span className="user-name">{currentUser.name}</span>
              <span className="user-role">{currentUser.role.replace('_', ' ')}</span>
            </div>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => {
                actions.logout()
                navigate('/')
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <nav className="bottom-nav mobile-only" aria-label="Primary">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.to === home}>
            {l.label}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
