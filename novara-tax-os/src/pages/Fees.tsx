import { useMemo, useState } from 'react'
import {
  CONSUMER_PRICES,
  OFFICE_SUBSCRIPTION_FLOOR,
  OFFICE_TIERS,
  STARTER_INCLUDES,
  TP_BUSINESS_BASE,
  TP_BUSINESS_SURCHARGE,
  TP_BUSINESS_TOTAL,
  TP_FEES,
  TP_PERSONAL_FEE,
  estimateNovaraAnnualCharges,
  formatMoney,
} from '../data/fees'
import './shared.css'
import './Fees.css'

const FAQ = [
  {
    q: 'Is $899 a monthly or annual fee?',
    a: 'Annual.',
  },
  {
    q: 'Does the $899 include unlimited returns?',
    a: 'Return allowances and charges depend on the subscription terms. Unlimited returns are not currently included in the published Starter Office terms.',
  },
  {
    q: 'Can I have multiple preparers?',
    a: 'NOVARA supports staff and preparer management. Any tier-specific seat limits must be clearly displayed.',
  },
  {
    q: 'Can I set my own customer preparation fees?',
    a: 'Yes, subject to applicable law and NOVARA’s agreements.',
  },
  {
    q: 'Are bank-product fees included?',
    a: 'No. They are separate and disclosed before authorization.',
  },
]

export function Fees() {
  const [individualReturns, setIndividualReturns] = useState(300)
  const [businessReturns, setBusinessReturns] = useState(0)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const estimate = useMemo(
    () =>
      estimateNovaraAnnualCharges({
        subscriptionAnnual: OFFICE_SUBSCRIPTION_FLOOR,
        individualReturns: Math.max(0, individualReturns),
        businessReturns: Math.max(0, businessReturns),
      }),
    [individualReturns, businessReturns],
  )

  const exampleIndividual = 300
  const examplePerReturn = exampleIndividual * TP_PERSONAL_FEE
  const exampleTotal = OFFICE_SUBSCRIPTION_FLOOR + examplePerReturn

  return (
    <div className="page container pricing-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Pricing transparency</p>
          <h1>How NOVARA Pricing Works</h1>
        </div>
        <span className="badge badge-ok">Approved floor &amp; TP fees</span>
      </header>

      <p className="pricing-intro muted rise">
        For tax office owners and independent preparers: annual subscriptions, per-return platform charges, and
        bank-product fees are separate. Only approved amounts are shown as final.
      </p>

      <section className="panel how-steps rise">
        <h2>How NOVARA Pricing Works</h2>
        <div className="how-grid">
          {[
            ['1', 'Subscribe to NOVARA Tax OS', `Starting at ${formatMoney(OFFICE_SUBSCRIPTION_FLOOR)} annually for Starter Office.`],
            ['2', 'Add your authorized tax preparers', 'Staff and preparer management under your sponsoring office EFIN.'],
            ['3', 'Pay applicable per-return and bank-product fees', 'Platform per-return fees and any bank/partner charges are billed separately.'],
          ].map(([n, title, body]) => (
            <div className="how-step" key={n}>
              <span>{n}</span>
              <div>
                <strong>{title}</strong>
                <p>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="list-panel panel rise rise-delay-1" style={{ marginTop: '1rem' }}>
        <div className="section-head">
          <h2>1. Tax Office Subscription — Starting at {formatMoney(OFFICE_SUBSCRIPTION_FLOOR)} Annually</h2>
          <span className="badge badge-ok">Approved floor</span>
        </div>
        <h3 className="subhead">What does my {formatMoney(OFFICE_SUBSCRIPTION_FLOOR)} pay for?</h3>
        <p className="muted">
          Your annual subscription provides access to the NOVARA Tax OS professional platform and the features included
          in your selected subscription tier. These may include:
        </p>
        <ul className="check-list">
          {STARTER_INCLUDES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="callout warn">
          <strong>Important:</strong> The annual subscription and per-return processing charges are separate. A
          subscription does not automatically mean unlimited free tax returns.
        </div>
        <div className="tier-list">
          {OFFICE_TIERS.map((t) => (
            <div className="row-item" key={t.id}>
              <div>
                <strong>{t.name}</strong>
                <span className="row-meta">{t.blurb}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong>
                  {t.annual != null
                    ? `${formatMoney(t.annual)}/yr`
                    : t.status === 'provisional'
                      ? 'TBD'
                      : 'Custom'}
                </strong>
                <div>
                  <span className={`badge ${t.status === 'approved' ? 'badge-ok' : 'badge-warn'}`}>
                    {t.status === 'approved' ? 'approved' : 'not final'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="list-panel panel" style={{ marginTop: '1rem' }}>
        <div className="section-head">
          <h2>2. Independent Tax Preparers</h2>
          <span className="badge badge-ok">Approved</span>
        </div>
        <h3 className="subhead">What happens when a preparer files under my office’s EFIN?</h3>
        <p className="muted">
          An independent preparer authorized to operate under a sponsoring tax office’s EFIN is charged:
        </p>
        <div className="fee-cards">
          <div className="fee-card">
            <span className="badge badge-ok">Approved</span>
            <p className="fee-label">Individual tax return</p>
            <p className="fee-amount">{formatMoney(TP_PERSONAL_FEE)}</p>
            <p className="muted">NOVARA platform fee per return</p>
          </div>
          <div className="fee-card">
            <span className="badge badge-ok">Approved</span>
            <p className="fee-label">Business tax return</p>
            <p className="fee-amount">{formatMoney(TP_BUSINESS_TOTAL)}</p>
            <p className="muted">
              {formatMoney(TP_BUSINESS_BASE)} base + {formatMoney(TP_BUSINESS_SURCHARGE)} business surcharge
            </p>
          </div>
        </div>
        <div className="callout">
          These are <strong>NOVARA platform fees</strong>, not the tax preparation fees charged to the customer.
        </div>
        {TP_FEES.map((f) => (
          <div className="row-item" key={f.id}>
            <div>
              <strong>{f.label}</strong>
              <span className="row-meta">{f.note}</span>
            </div>
            <strong>{formatMoney(f.amount)}</strong>
          </div>
        ))}
      </section>

      <section className="list-panel panel" style={{ marginTop: '1rem' }}>
        <div className="section-head">
          <h2>3. Bank Products</h2>
          <span className="badge badge-warn">Partner pending</span>
        </div>
        <p className="muted" style={{ marginTop: 0 }}>
          Bank-product fees are separate from the NOVARA subscription and per-return fees.
        </p>
        <p>
          Any applicable bank, refund-transfer, or partner charges must be disclosed and itemized before the taxpayer
          authorizes the transaction.
        </p>
        <div className="callout warn">
          Partner bank fees are not set by NOVARA and are never shown here as finalized NOVARA subscription terms.
        </div>
      </section>

      <section className="list-panel panel" style={{ marginTop: '1rem' }}>
        <h2>4. Pricing Example</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          An office subscribes to NOVARA for {formatMoney(OFFICE_SUBSCRIPTION_FLOOR)} annually. The office has three
          independent preparers. Each preparer completes 100 individual returns.
        </p>
        <div className="example-math">
          <div className="row-item">
            <div>
              <strong>
                {exampleIndividual} returns × {formatMoney(TP_PERSONAL_FEE)}
              </strong>
              <span className="row-meta">Independent preparer individual-return fees</span>
            </div>
            <strong>{formatMoney(examplePerReturn)}</strong>
          </div>
          <div className="row-item">
            <div>
              <strong>Annual office subscription</strong>
              <span className="row-meta">Starter Office floor</span>
            </div>
            <strong>{formatMoney(OFFICE_SUBSCRIPTION_FLOOR)}</strong>
          </div>
          <div className="row-item total-row">
            <div>
              <strong>Total NOVARA platform charges</strong>
              <span className="row-meta">Subscription + per-return platform fees</span>
            </div>
            <strong>{formatMoney(exampleTotal)}</strong>
          </div>
        </div>
        <p className="muted">
          This example assumes all {exampleIndividual} returns are subject to the independent preparer fee. Tax
          preparation revenue collected from customers and any bank-product fees are separate.
        </p>
      </section>

      <section className="list-panel panel calculator" style={{ marginTop: '1rem' }}>
        <h2>Fee calculator — estimated annual NOVARA charges</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Uses the approved Starter Office floor ({formatMoney(OFFICE_SUBSCRIPTION_FLOOR)}/yr) and approved independent
          preparer per-return fees. Bank-product fees are excluded.
        </p>
        <div className="calc-grid">
          <div className="field">
            <label htmlFor="ind">Individual returns (TP fee {formatMoney(TP_PERSONAL_FEE)})</label>
            <input
              id="ind"
              type="number"
              min={0}
              value={individualReturns}
              onChange={(e) => setIndividualReturns(Number(e.target.value) || 0)}
            />
          </div>
          <div className="field">
            <label htmlFor="biz">Business returns (TP fee {formatMoney(TP_BUSINESS_TOTAL)})</label>
            <input
              id="biz"
              type="number"
              min={0}
              value={businessReturns}
              onChange={(e) => setBusinessReturns(Number(e.target.value) || 0)}
            />
          </div>
        </div>
        <div className="example-math" style={{ marginTop: '0.75rem' }}>
          <div className="row-item">
            <div>
              <strong>Subscription</strong>
              <span className="row-meta">Starter Office annual floor</span>
            </div>
            <strong>{formatMoney(OFFICE_SUBSCRIPTION_FLOOR)}</strong>
          </div>
          <div className="row-item">
            <div>
              <strong>Individual return fees</strong>
              <span className="row-meta">
                {individualReturns} × {formatMoney(TP_PERSONAL_FEE)}
              </span>
            </div>
            <strong>{formatMoney(estimate.individualFees)}</strong>
          </div>
          <div className="row-item">
            <div>
              <strong>Business return fees</strong>
              <span className="row-meta">
                {businessReturns} × {formatMoney(TP_BUSINESS_TOTAL)}
              </span>
            </div>
            <strong>{formatMoney(estimate.businessFees)}</strong>
          </div>
          <div className="row-item total-row">
            <div>
              <strong>Estimated annual NOVARA platform charges</strong>
              <span className="row-meta">Does not include customer prep fees or bank products</span>
            </div>
            <strong>{formatMoney(estimate.total)}</strong>
          </div>
        </div>
      </section>

      <section className="list-panel panel" style={{ marginTop: '1rem' }}>
        <h2>5. Pricing FAQ</h2>
        <div className="faq-list">
          {FAQ.map((item, i) => {
            const open = openFaq === i
            return (
              <div className="faq-item" key={item.q}>
                <button type="button" className="faq-q" onClick={() => setOpenFaq(open ? null : i)} aria-expanded={open}>
                  <span>Q: {item.q}</span>
                  <span aria-hidden>{open ? '−' : '+'}</span>
                </button>
                {open && (
                  <p className="faq-a">
                    <strong>A:</strong> {item.a}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="list-panel panel" style={{ marginTop: '1rem' }}>
        <div className="section-head">
          <h2>Direct consumer prices</h2>
          <span className="badge badge-warn">Not finalized</span>
        </div>
        <p className="muted" style={{ marginTop: 0 }}>
          Provisional proposals only — not approved subscription or TP terms. Shown for internal reference; do not treat
          as published final prices.
        </p>
        {CONSUMER_PRICES.map((f) => (
          <div className="row-item" key={f.id}>
            <div>
              <strong>{f.label}</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <strong>From {formatMoney(f.amount)}</strong>
              <div>
                <span className="badge badge-warn">provisional</span>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
