import { Link } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { OFFICE_TIERS, TP_FEES, formatMoney } from '../data/fees'
import './Landing.css'

export function Landing() {
  return (
    <div className="app-shell">
      <section className="landing-hero">
        <div className="hero-orb" aria-hidden />
        <div className="hero-doc-stack" aria-hidden>
          <div className="hero-doc" />
          <div className="hero-doc" />
          <div className="hero-doc" />
        </div>
        <div className="container">
          <nav className="landing-nav">
            <div className="landing-brand">
              <BrandMark size={44} />
              <div>
                <strong className="brand">NOVARA</strong>
                <span>Tax OS</span>
              </div>
            </div>
            <Link className="btn btn-secondary" to="/login">
              Sign in
            </Link>
          </nav>
          <div className="hero-copy">
            <p className="badge rise" style={{ background: 'rgba(255,255,255,0.14)', color: 'white' }}>
              AI Tax Business Operating System
            </p>
            <h1 className="brand rise rise-delay-1">NOVARA</h1>
            <p className="lead rise rise-delay-2">
              Upload your documents. Your Tax AI becomes the expert and handles the rest.
            </p>
            <div className="hero-actions rise rise-delay-3">
              <Link className="btn btn-primary" to="/login">
                Start My Taxes
              </Link>
              <a className="btn btn-secondary" href="#how">
                See how it works
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="how">
        <div className="container">
          <h2>Five screens. Near-zero typing.</h2>
          <p className="section-lead">
            The consumer path hides tax-form complexity. AI extracts and proposes; the deterministic engine calculates;
            credentialed review and signatures gate e-file.
          </p>
          <div className="flow-grid">
            {[
              ['Drop Zone', 'Upload anything — photos, PDFs, bundles.'],
              ['Smart Questions', 'Answer only true gaps — usually ≤10 for W-2.'],
              ['Your Result', 'Refund/owed with a 30-second explanation.'],
              ['Approve & Sign', 'Human review when required, then e-sign.'],
              ['Year-Round Home', 'Notices, estimates, next-year checklist.'],
            ].map(([title, body]) => (
              <div className="flow-step panel" key={title}>
                <strong>{title}</strong>
                <p className="muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <h2>Four distinct paths</h2>
          <p className="section-lead">Separate enrollment, permissions, contracts, billing, and reporting.</p>
          <div className="audience-grid">
            {[
              ['Direct taxpayer', 'Upload-and-verify preparation with personal Tax AI.'],
              ['Independent preparer (TP)', 'Assigned under a sponsoring office — PTIN alone does not grant EFIN filing authority.'],
              ['EFIN tax office', 'License NOVARA Tax OS; keep your EFIN, clients, and pricing.'],
              ['Business tax', '1065 / 1120-S / 1120 with workpapers, K-1s, and owner links.'],
            ].map(([title, body]) => (
              <article className="audience-item panel" key={title}>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <h2>Approved fees (Addendum F)</h2>
          <p className="section-lead">
            Subscriptions start at $899/year. Per-return and bank-product fees are separate — a subscription does not
            mean unlimited free returns. Only approved amounts are shown as final.
          </p>
          <div className="price-grid">
            {TP_FEES.map((f) => (
              <article className="price-item panel" key={f.id}>
                <span className="badge badge-ok">Approved</span>
                <h3>{f.label}</h3>
                <p className="amount">{formatMoney(f.amount)}</p>
                <p>{f.note}</p>
              </article>
            ))}
            <article className="price-item panel">
              <span className="badge badge-ok">Approved floor</span>
              <h3>{OFFICE_TIERS[0].name}</h3>
              <p className="amount">{formatMoney(OFFICE_TIERS[0].annual ?? 899)}</p>
              <p>{OFFICE_TIERS[0].blurb}</p>
            </article>
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <Link className="btn btn-primary" to="/login">
              Enter the demo
            </Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="container">
          <strong className="brand" style={{ color: 'var(--ink)' }}>
            NOVARA
          </strong>{' '}
          Tax OS — local V1 prototype. Data stays on this device. Not connected to production e-file or bank partners.
        </div>
      </footer>
    </div>
  )
}
