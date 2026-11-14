import { Link, NavLink, useNavigate } from 'react-router-dom'
import { BrandMark } from './BrandMark'
import { MusicControls } from './MusicControls'
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
          { to: '/app/taxpayer/prepare', label: 'Questionnaire' },
          { to: '/app/taxpayer/benefits', label: 'Savings' },
          { to: '/app/taxpayer/years', label: 'Years' },
          { to: '/app/taxpayer/assistant', label: 'Chat' },
          { to: '/app/taxpayer/final-review', label: 'Sign & file' },
          { to: '/app/taxpayer/vault', label: 'Vault' },
        ]
      : currentUser.role === 'preparer'
        ? [
            { to: '/app/preparer', label: 'Inbox' },
            { to: '/app/preparer/clients', label: 'Clients' },
            { to: '/app/preparer/request-docs', label: 'Request' },
            { to: '/app/preparer/return', label: 'Return' },
            { to: '/app/preparer/final-review', label: 'Sign & file' },
            { to: '/app/preparer/benefits', label: 'Benefits' },
          ]
        : currentUser.role === 'efin_owner'
          ? [
              { to: '/app/office', label: 'Office' },
              { to: '/app/office/staff', label: 'Staff' },
              { to: '/app/office/pipeline', label: 'Pipeline' },
              { to: '/app/office/request-docs', label: 'Request' },
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
            <MusicControls compact className="nav-music" />
            <div className="user-chip">
              <span className="user-name">{currentUser.name}</span>
              <span className="user-role">
                {currentUser.accountType === 'independent_tp'
                  ? 'TP · clients only'
                  : currentUser.accountType === 'office_owner'
                    ? 'Office owner'
                    : currentUser.accountType === 'office_preparer'
                      ? 'Office preparer'
                      : currentUser.accountType === 'tc'
                        ? 'Tax client'
                        : currentUser.role.replace('_', ' ')}
              </span>
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
