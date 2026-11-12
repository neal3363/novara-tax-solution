import { Link } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import {
  OFFICE_BUSINESS_FEE,
  OFFICE_PERSONAL_FEE,
  OFFICE_SUBSCRIPTION_FLOOR,
  OFFICE_SUBSCRIPTION_HIGH,
  STARTER_INCLUDES,
  TC_BUSINESS_FEE,
  TC_PERSONAL_FEE,
  TP_BUSINESS_FEE,
  TP_PERSONAL_FEE,
  TP_REGISTRATION_FEE,
  UNLIMITED_CLIENTS_COPY,
  formatMoney,
} from '../data/fees'
import './Landing.css'

const FEATURES: { title: string; body: string; status: 'live' | 'partial' | 'soon' }[] = [
  {
    title: 'Zero Manual Tax-Form Entry',
    body: 'AI extracts information from uploaded documents so you confirm — not re-type — accurate values.',
    status: 'live',
  },
  {
    title: 'AI Tax Assistant',
    body: 'Answers questions and guides you through filing with a conversational smart interview.',
    status: 'live',
  },
  {
    title: 'Maximum Refund Discovery',
    body: 'Investigates potentially available credits and deductions before the return is considered complete.',
    status: 'live',
  },
  {
    title: 'Filing Status Assistance',
    body: 'Helps evaluate Single, MFJ, MFS, Head of Household, and Qualifying Surviving Spouse eligibility.',
    status: 'live',
  },
  {
    title: 'Dependent & Childcare Benefits',
    body: 'Evaluates family-related credits and asks follow-ups only when they may apply.',
    status: 'live',
  },
  {
    title: 'Education Benefits',
    body: 'Checks qualifying tuition, student loan interest, and education credit alternatives.',
    status: 'live',
  },
  {
    title: 'Business Tax Deductions',
    body: 'Explores eligible self-employment and business expenses, including QBI screening.',
    status: 'live',
  },
  {
    title: 'Homeownership Benefits',
    body: 'Evaluates mortgage interest, property tax, and related itemized vs standard comparisons.',
    status: 'live',
  },
  {
    title: 'Federal & State Returns',
    body: 'Federal return workflow is in the demo. Broader state coverage expands as jurisdictions are enabled.',
    status: 'partial',
  },
  {
    title: 'Secure Document Storage',
    body: 'Session-scoped Tax Vault stores uploaded documents and extracted facts in this demo environment.',
    status: 'live',
  },
  {
    title: 'Electronic Signatures',
    body: 'Demo e-sign and approval workflow before simulated transmission.',
    status: 'live',
  },
  {
    title: 'Return Status Tracking',
    body: 'Taxpayer home and office pipeline show preparation and filing progress.',
    status: 'live',
  },
]

const COMPARE = [
  ['Manual form filling', 'Document upload + AI extraction'],
  ['Guess which credits apply', 'Proactive tax-benefit discovery interview'],
  ['Stop when the return “looks done”', 'Stop only after benefit review is complete'],
  ['Separate tools for offices', 'Unified taxpayer + preparer + office OS'],
  ['Opaque software fees', 'Transparent subscription vs per-return vs bank fees'],
]

export function Landing() {
  return (
    <div className="app-shell home">
      <section className="landing-hero">
        <div className="hero-atmosphere" aria-hidden />
        <div className="container hero-shell">
          <nav className="landing-nav">
            <div className="landing-brand">
              <BrandMark size={44} />
              <div>
                <strong className="brand">NOVARA</strong>
                <span>Tax OS</span>
              </div>
            </div>
            <div className="hero-nav-actions">
              <a className="nav-text" href="#how">
                How it works
              </a>
              <a className="nav-text" href="#professionals">
                Professionals
              </a>
              <Link className="btn btn-secondary landing-ghost" to="/login?intent=professional">
                Tax pros
              </Link>
              <Link className="btn btn-primary hero-solid" to="/register">
                Start
              </Link>
            </div>
          </nav>

          <div className="hero-copy">
            <p className="hero-brand brand rise">NOVARA TAX OS</p>
            <h1 className="rise rise-delay-1">AI-Powered Tax Preparation Made Simple</h1>
            <p className="hero-tagline rise rise-delay-2">Upload It. Answer Questions. Maximize Your Refund.</p>
            <p className="lead rise rise-delay-2">
              No tax forms to fill out. No complicated data entry. No guessing which tax deductions you qualify for.
            </p>
            <p className="lead soft rise rise-delay-3">
              NOVARA’s AI reads your documents, prepares your return, asks intelligent questions, and searches for every
              potentially available tax benefit to help maximize your legal refund.
            </p>
            <div className="hero-actions rise rise-delay-3">
              <Link className="btn btn-primary hero-solid" to="/register/tc">
                Start My Tax Return
              </Link>
              <Link className="btn btn-secondary landing-ghost" to="/register">
                I’m a Tax Professional
              </Link>
              <a className="btn btn-ghost landing-ghost" href="#features">
                Explore Features
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="how">
        <div className="container">
          <p className="landing-kicker">How NOVARA works</p>
          <h2>Five Simple Steps</h2>
          <p className="section-lead">From upload to e-file — without forcing you through blank tax forms.</p>
          <div className="steps-grid">
            {[
              [
                'STEP 1 — UPLOAD',
                'Upload your driver’s license, Social Security card, W-2s, 1099s, and other available tax documents securely.',
              ],
              [
                'STEP 2 — ANSWER',
                'Our AI asks simple questions about your filing status, dependents, childcare, education, business expenses, and other circumstances.',
              ],
              [
                'STEP 3 — OPTIMIZE',
                'NOVARA evaluates applicable tax credits, deductions, and filing options to help identify your maximum legally allowable refund.',
              ],
              [
                'STEP 4 — REVIEW',
                'See your estimated refund, discovered tax benefits, and completed return summary. Confirm that everything is accurate.',
              ],
              [
                'STEP 5 — SIGN & FILE',
                'Electronically sign your return and submit through an authorized e-filing process when available.',
              ],
            ].map(([title, body], i) => (
              <article className="step-block" key={title}>
                <span className="step-index">{String(i + 1).padStart(2, '0')}</span>
                <strong>{title}</strong>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="features" style={{ paddingTop: 0 }}>
        <div className="container">
          <p className="landing-kicker">Capabilities</p>
          <h2>Everything NOVARA Does for You</h2>
          <p className="section-lead">
            Live demo features are marked clearly. Anything not fully operational is labeled Coming soon.
          </p>
          <div className="feature-grid">
            {FEATURES.map((f) => (
              <article className="feature-item" key={f.title}>
                <div className="feature-top">
                  <h3>{f.title}</h3>
                  <span
                    className={`badge ${
                      f.status === 'live' ? 'badge-ok' : f.status === 'partial' ? 'badge-warn' : 'badge-neutral'
                    }`}
                  >
                    {f.status === 'live' ? 'In demo' : f.status === 'partial' ? 'Partial' : 'Coming soon'}
                  </span>
                </div>
                <p>{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section maximize-section" id="maximize">
        <div className="container">
          <p className="landing-kicker">Maximum Refund Discovery</p>
          <h2>Don’t Leave Eligible Tax Benefits Unclaimed</h2>
          <p className="section-lead">
            Many taxpayers don’t know which tax credits and deductions they may qualify for. NOVARA asks intelligent
            questions to investigate benefits related to:
          </p>
          <ul className="benefit-bullets">
            {[
              'Children and qualifying dependents',
              'Daycare and childcare expenses',
              'College and education',
              'Retirement savings',
              'Self-employment',
              'Homeownership',
              'Charitable giving',
              'Medical expenses',
              'Other applicable federal and state benefits',
            ].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="maximize-closer">
            NOVARA doesn’t just prepare your return. It investigates opportunities to reduce your taxes legally.
          </p>
          <Link className="btn btn-primary" to="/login?intent=taxpayer">
            Start My Tax Return
          </Link>
        </div>
      </section>

      <section className="section" id="professionals" style={{ paddingTop: 0 }}>
        <div className="container">
          <p className="landing-kicker">For tax offices</p>
          <h2>Run Your Entire Tax Office With NOVARA</h2>
          <p className="section-lead">
            For tax professionals, NOVARA provides a unified platform for AI-assisted preparation, office operations, and
            transparent fees.
          </p>
          <div className="pro-grid">
            {[
              ['AI-assisted tax preparation', 'live'],
              ['Office and preparer management', 'live'],
              ['EFIN-based workflows', 'partial'],
              ['Client intake and document management', 'live'],
              ['Individual and supported business tax returns', 'live'],
              ['Tax-benefit optimization', 'live'],
              ['Return pipeline management', 'live'],
              ['Electronic signature workflows', 'live'],
              ['Bank-product integrations where available', 'soon'],
              ['Fee management and reporting', 'live'],
              ['Service bureau administration', 'soon'],
              ['Secure, role-based access', 'partial'],
            ].map(([label, status]) => (
              <div className="pro-item" key={label}>
                <strong>{label}</strong>
                <span className={`badge ${status === 'live' ? 'badge-ok' : status === 'partial' ? 'badge-warn' : 'badge-neutral'}`}>
                  {status === 'live' ? 'In demo' : status === 'partial' ? 'Partial' : 'Coming soon'}
                </span>
              </div>
            ))}
          </div>

          <div className="pricing-band panel">
            <div>
              <p className="landing-kicker">Three tiers · one price catalog</p>
              <h3>
                Office {formatMoney(OFFICE_SUBSCRIPTION_FLOOR)}–{formatMoney(OFFICE_SUBSCRIPTION_HIGH)} · TP upfront{' '}
                {formatMoney(TP_REGISTRATION_FEE)}
              </h3>
              <p className="muted">
                {UNLIMITED_CLIENTS_COPY} for TP and Office. Per-return software fees stay separate from banking-product
                fees.
              </p>
              <ul className="mini-list">
                {STARTER_INCLUDES.slice(0, 5).map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
              <p className="fee-line">
                TC personal {formatMoney(TC_PERSONAL_FEE)} / business {formatMoney(TC_BUSINESS_FEE)} · TP{' '}
                {formatMoney(TP_PERSONAL_FEE)} / {formatMoney(TP_BUSINESS_FEE)} · Office{' '}
                {formatMoney(OFFICE_PERSONAL_FEE)} / {formatMoney(OFFICE_BUSINESS_FEE)}
              </p>
            </div>
            <div className="pricing-band-actions">
              <Link className="btn btn-primary" to="/register">
                Register — TC · TP · Office
              </Link>
              <Link className="btn btn-secondary" to="/login?intent=pricing">
                View Professional Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="compare" style={{ paddingTop: 0 }}>
        <div className="container">
          <p className="landing-kicker">Why choose NOVARA?</p>
          <h2>Traditional Tax Preparation vs. NOVARA</h2>
          <div className="compare-table panel">
            <div className="compare-head">
              <span>Traditional</span>
              <span>NOVARA</span>
            </div>
            {COMPARE.map(([left, right]) => (
              <div className="compare-row" key={left}>
                <span>{left}</span>
                <span>{right}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="trust" style={{ paddingTop: 0 }}>
        <div className="container">
          <p className="landing-kicker">Trust and security</p>
          <h2>Built with taxpayer protection in mind</h2>
          <p className="section-lead">
            This public demo uses sample data and session storage. We only describe controls that exist in the product
            design or demo — not certifications that have not been obtained.
          </p>
          <div className="trust-grid">
            {[
              'Encrypted transport in production architectures (TLS)',
              'Protected handling of taxpayer identification fields in workflows',
              'Secure authentication path for published private apps via Cursor sign-in',
              'Authorized preparer / role-scoped demo access after login',
              'Document verification and extraction confidence checks',
              'Audit-oriented event messaging and benefit rule citations',
              'Human review and filing gates before transmission',
            ].map((item) => (
              <div className="trust-item" key={item}>
                <span aria-hidden>●</span>
                <p>{item}</p>
              </div>
            ))}
          </div>
          <p className="muted trust-note">
            SOC reports, IRS provider approvals, and production e-file authorization are not advertised here until
            obtained and implemented.
          </p>
        </div>
      </section>

      <section className="final-cta">
        <div className="container">
          <h2>Your Taxes. Simplified. Your Refund. Optimized.</h2>
          <p>Let NOVARA handle the complicated work.</p>
          <p className="cta-steps">Upload. Answer. Optimize. Review. File.</p>
          <div className="hero-actions">
              <Link className="btn btn-primary hero-solid" to="/register/tc">
                Start Filing
              </Link>
            <Link className="btn btn-secondary landing-ghost" to="/register">
              Join as a Tax Professional
            </Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="container footer-row">
          <div>
            <strong className="brand">NOVARA</strong> Tax OS
          </div>
          <div className="footer-links">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#professionals">Professionals</a>
            <Link to="/login">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
