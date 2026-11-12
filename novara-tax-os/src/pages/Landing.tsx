import { Link } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { OFFICE_SUBSCRIPTION_FLOOR, TP_BUSINESS_TOTAL, TP_PERSONAL_FEE, formatMoney } from '../data/fees'
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
            <div className="hero-nav-actions">
              <a className="btn btn-ghost landing-ghost" href="#updates">
                What’s new
              </a>
              <Link className="btn btn-secondary" to="/login">
                Sign in
              </Link>
            </div>
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
                Open the updated demo
              </Link>
              <a className="btn btn-secondary" href="#updates">
                See latest updates
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="updates">
        <div className="container">
          <p className="landing-kicker">Latest build updates</p>
          <h2>Your requested features are live in the demo</h2>
          <p className="section-lead">
            Sign in with a demo role to open them. They are not only on this marketing page — they are inside the product
            screens below.
          </p>
          <div className="update-grid">
            <article className="update-card panel">
              <span className="badge badge-ok">New</span>
              <h3>AI Smart Tax Interview</h3>
              <p>
                Document-first: upload → extract → confirm → filing status → benefit discovery → calculate → review →
                e-file. Asks once; never re-types accurate extracted data.
              </p>
              <p className="update-path">
                Sign in as <strong>Direct taxpayer</strong> → <strong>Prepare</strong>
              </p>
            </article>
            <article className="update-card panel">
              <span className="badge badge-ok">New</span>
              <h3>Tax Benefit Optimization Engine</h3>
              <p>
                Discovers credits/deductions, asks follow-ups, compares legal options, and runs a mandatory benefit audit
                before filing.
              </p>
              <p className="update-path">
                Sign in as <strong>Direct taxpayer</strong> → <strong>Savings</strong>, or <strong>Tax preparer</strong> →{' '}
                <strong>Benefits</strong>
              </p>
            </article>
            <article className="update-card panel">
              <span className="badge badge-ok">New</span>
              <h3>Refund Opportunity Tracker</h3>
              <p>
                Live projection that moves when benefits are discovered and verified (for example childcare after
                dependents).
              </p>
              <p className="update-path">
                Visible on taxpayer Home and preparer Return / Benefits
              </p>
            </article>
            <article className="update-card panel">
              <span className="badge badge-ok">New</span>
              <h3>Preparer Return workspace</h3>
              <p>
                Actual return editor for income, dependents, childcare, education, and deductions — not status-only.
              </p>
              <p className="update-path">
                Sign in as <strong>Tax preparer</strong> → <strong>Return</strong>
              </p>
            </article>
            <article className="update-card panel">
              <span className="badge badge-ok">New</span>
              <h3>Filed-style entry plan</h3>
              <p>Reads documents → you approve/correct/remove field mappings → then enters values.</p>
              <p className="update-path">
                Sign in as <strong>Tax preparer</strong> → <strong>Entry</strong>
              </p>
            </article>
            <article className="update-card panel">
              <span className="badge badge-ok">New</span>
              <h3>Pricing transparency</h3>
              <p>
                {formatMoney(OFFICE_SUBSCRIPTION_FLOOR)} annual floor, {formatMoney(TP_PERSONAL_FEE)} /{' '}
                {formatMoney(TP_BUSINESS_TOTAL)} TP fees, bank fees separate, FAQ, and fee calculator.
              </p>
              <p className="update-path">
                Sign in as <strong>EFIN office owner</strong> → <strong>Pricing</strong>
              </p>
            </article>
            <article className="update-card panel">
              <span className="badge badge-neutral">Clarified</span>
              <h3>Pipeline vs Return</h3>
              <p>
                Pipeline tracks office status only. The tax-preparation engine is under Preparer → Return + Benefits.
              </p>
              <p className="update-path">
                Office owner → Pipeline (status) · Preparer → Return (editing)
              </p>
            </article>
          </div>
          <div style={{ marginTop: '1.25rem' }}>
            <Link className="btn btn-primary" to="/login">
              Sign in to open updates
            </Link>
          </div>
        </div>
      </section>

      <section className="section" id="how" style={{ paddingTop: 0 }}>
        <div className="container">
          <h2>How NOVARA Pricing Works</h2>
          <p className="section-lead">
            Annual subscription, per-return platform fees, and bank-product fees are separate. A subscription does not
            mean unlimited free returns.
          </p>
          <div className="flow-grid pricing-steps">
            {[
              ['1. Subscribe', `Starter Office from ${formatMoney(OFFICE_SUBSCRIPTION_FLOOR)} / year`],
              ['2. Add preparers', 'Staff and authorized TPs under your office EFIN'],
              ['3. Pay usage fees', `TP individual ${formatMoney(TP_PERSONAL_FEE)} · business ${formatMoney(TP_BUSINESS_TOTAL)}`],
            ].map(([title, body]) => (
              <div className="flow-step panel" key={title}>
                <strong>{title}</strong>
                <p className="muted">{body}</p>
              </div>
            ))}
          </div>
          <p className="section-lead" style={{ marginTop: '1.25rem' }}>
            Example: {formatMoney(OFFICE_SUBSCRIPTION_FLOOR)} subscription + 300 × {formatMoney(TP_PERSONAL_FEE)} ={' '}
            <strong>{formatMoney(OFFICE_SUBSCRIPTION_FLOOR + 300 * TP_PERSONAL_FEE)}</strong> NOVARA platform charges
            (customer prep fees and bank products separate).
          </p>
          <Link className="btn btn-secondary" to="/login">
            Open full Pricing page in demo
          </Link>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <h2>Five screens. Near-zero typing.</h2>
          <p className="section-lead">
            Consumer path hides tax-form complexity. After the return is filled, NOVARA still runs comprehensive tax-benefit
            review before filing.
          </p>
          <div className="flow-grid">
            {[
              ['Drop Zone', 'Upload anything — photos, PDFs, bundles.'],
              ['Smart Questions', 'Answer only true gaps — usually ≤10 for W-2.'],
              ['Your Result', 'Refund/owed with a 30-second explanation.'],
              ['Benefit Audit', 'Discover credits/deductions; unlock filing only after review.'],
              ['Approve & Sign', 'Human review when required, then e-sign.'],
            ].map(([title, body]) => (
              <div className="flow-step panel" key={title}>
                <strong>{title}</strong>
                <p className="muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="container">
          <strong className="brand" style={{ color: 'var(--ink)' }}>
            NOVARA
          </strong>{' '}
          Tax OS — demo uses sample data. Sign in to see Savings, Return, Entry plan, and Pricing updates.
        </div>
      </footer>
    </div>
  )
}
