import { Link } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import './shared.css'

type LegalKind = 'privacy' | 'terms' | 'help'

const COPY: Record<
  LegalKind,
  { title: string; eyebrow: string; sections: { h: string; p: string }[] }
> = {
  privacy: {
    title: 'Privacy Policy (draft)',
    eyebrow: 'Legal',
    sections: [
      {
        h: 'Status',
        p: 'This page is a draft placeholder for counsel review. It is not a final Privacy Policy and must not be treated as Pub. 4557 or FTC Safeguards certification.',
      },
      {
        h: 'What NOVARA intends to protect',
        p: 'Taxpayer identification numbers, financial documents, tax returns, and account credentials. Production processing of real taxpayer data remains disabled until independent security assessment and owner launch authorization are complete.',
      },
      {
        h: 'Current demo mode',
        p: 'The public application operates with synthetic sample data. Do not upload real Social Security numbers, bank account numbers, or government IDs to the demo.',
      },
      {
        h: 'Contact',
        p: 'For privacy requests once production is authorized, contact the NOVARA owner through the official business channel. Production support email is not yet activated.',
      },
    ],
  },
  terms: {
    title: 'Terms of Service (draft)',
    eyebrow: 'Legal',
    sections: [
      {
        h: 'Status',
        p: 'This page is a draft placeholder pending legal counsel. It does not create a binding commercial filing agreement for live IRS transmission.',
      },
      {
        h: 'Demo limitation',
        p: 'Live IRS e-file, live payments, and live banking products are disabled. Sandbox quotes and mock acknowledgments are not production activity.',
      },
      {
        h: 'Pricing',
        p: 'Approved NOVARA fees are published on the Fees page and configured in the application pricing source of truth. Existing customer billing agreements are not auto-migrated.',
      },
      {
        h: 'Accounts',
        p: 'Tax Preparers access only their own clients. Tax Offices manage preparers under their EFIN workspace. Cross-tenant access is denied by design.',
      },
    ],
  },
  help: {
    title: 'Help Center',
    eyebrow: 'Support',
    sections: [
      {
        h: 'Getting started',
        p: 'Use Start filing for a Tax Client workspace, or open Fees to review Tax Preparer pay-per-return and Tax Office annual plans.',
      },
      {
        h: 'Demo vs production',
        p: 'This environment is a synthetic public demo. Real taxpayer filing, live card charges, and bank products require owner authorization and external approvals.',
      },
      {
        h: 'Password reset',
        p: 'Staging password-reset token logic exists for future production auth. The public demo uses workspace/session entry rather than email/password recovery.',
      },
      {
        h: 'Support tickets',
        p: 'A production ticket system and branded support email are not yet connected. Escalate operational issues to the owner-controlled repository and Cursor app admin.',
      },
    ],
  },
}

export function LegalPage({ kind }: { kind: LegalKind }) {
  const doc = COPY[kind]
  return (
    <div className="page container">
      <header className="page-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <p className="eyebrow">{doc.eyebrow}</p>
          <h1>{doc.title}</h1>
          <p className="muted" style={{ maxWidth: '40rem' }}>
            NOVARA Tax OS — owner-controlled documentation surface.
          </p>
        </div>
        <BrandMark size={40} />
      </header>

      {doc.sections.map((s) => (
        <section key={s.h} className="panel" style={{ marginBottom: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>{s.h}</h2>
          <p className="muted" style={{ marginBottom: 0 }}>
            {s.p}
          </p>
        </section>
      ))}

      <p style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link to="/">Home</Link>
        <Link to="/fees">Fees</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/help">Help</Link>
      </p>
    </div>
  )
}

export function PrivacyPage() {
  return <LegalPage kind="privacy" />
}

export function TermsPage() {
  return <LegalPage kind="terms" />
}

export function HelpPage() {
  return <LegalPage kind="help" />
}
