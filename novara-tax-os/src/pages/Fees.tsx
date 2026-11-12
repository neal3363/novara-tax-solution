import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BANKING_FEES_NOTE,
  OFFICE_BUSINESS_FEE,
  OFFICE_FEES,
  OFFICE_PERSONAL_FEE,
  OFFICE_SUBSCRIPTION_FLOOR,
  OFFICE_SUBSCRIPTION_HIGH,
  OFFICE_TIERS,
  PRICING,
  STARTER_INCLUDES,
  TC_BUSINESS_FEE,
  TC_FEES,
  TC_PERSONAL_FEE,
  TP_BUSINESS_FEE,
  TP_FEES,
  TP_PERSONAL_FEE,
  TP_REGISTRATION_FEE,
  UNLIMITED_CLIENTS_COPY,
  estimateNovaraAnnualCharges,
  formatMoney,
} from '../data/fees'
import './shared.css'
import './Fees.css'

const FAQ = [
  {
    q: 'Is the office subscription monthly or annual?',
    a: `Billing frequency is configurable until finalized. This demo displays ${PRICING.Office.subscriptionBillingFrequency} amounts of ${formatMoney(OFFICE_SUBSCRIPTION_FLOOR)} and ${formatMoney(OFFICE_SUBSCRIPTION_HIGH)}.`,
  },
  {
    q: 'Do TP or Office accounts limit clients or returns?',
    a: `No. ${UNLIMITED_CLIENTS_COPY}. Only approved per-return software fees apply for standard usage.`,
  },
  {
    q: 'Can an office have multiple preparers?',
    a: 'Yes. Office owners add preparers with individual logins under the office tenant. Unauthorized EFIN use is blocked.',
  },
  {
    q: 'Are bank-product fees included?',
    a: 'No. They are separate and disclosed before authorization.',
  },
  {
    q: 'Does a TP also pay the TC retail price?',
    a: 'No. TC retail fees and TP/Office software fees are separate billing relationships. Do not stack them on the same charge line.',
  },
]

export function Fees() {
  const [individualReturns, setIndividualReturns] = useState(300)
  const [businessReturns, setBusinessReturns] = useState(0)
  const [schedule, setSchedule] = useState<'Office' | 'TP'>('Office')
  const [subAmount, setSubAmount] = useState<number>(OFFICE_SUBSCRIPTION_FLOOR)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const estimate = useMemo(
    () =>
      estimateNovaraAnnualCharges({
        subscriptionAnnual: schedule === 'Office' ? subAmount : TP_REGISTRATION_FEE,
        individualReturns: Math.max(0, individualReturns),
        businessReturns: Math.max(0, businessReturns),
        schedule,
      }),
    [individualReturns, businessReturns, schedule, subAmount],
  )

  return (
    <div className="page container pricing-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Three-tier pricing</p>
          <h1>NOVARA Pricing — TC · TP · Office</h1>
        </div>
        <Link className="btn btn-primary" to="/register">
          Register
        </Link>
      </header>

      <p className="pricing-intro muted rise">
        All screens read from one pricing catalog. Banking-product fees are separate. Existing AI tax preparation is
        unchanged across tiers.
      </p>

      <section className="panel how-steps rise">
        <h2>Official fee table</h2>
        <div className="fee-table" role="table">
          <div className="fee-table-row head" role="row">
            <span>Fee</span>
            <span>TC</span>
            <span>TP</span>
            <span>Office</span>
          </div>
          <div className="fee-table-row" role="row">
            <span>Registration / subscription</span>
            <span>{formatMoney(0)}</span>
            <span>{formatMoney(TP_REGISTRATION_FEE)}</span>
            <span>
              {formatMoney(OFFICE_SUBSCRIPTION_FLOOR)}–{formatMoney(OFFICE_SUBSCRIPTION_HIGH)}
            </span>
          </div>
          <div className="fee-table-row" role="row">
            <span>Personal tax return</span>
            <span>{formatMoney(TC_PERSONAL_FEE)}</span>
            <span>{formatMoney(TP_PERSONAL_FEE)}</span>
            <span>{formatMoney(OFFICE_PERSONAL_FEE)}</span>
          </div>
          <div className="fee-table-row" role="row">
            <span>Business tax return</span>
            <span>{formatMoney(TC_BUSINESS_FEE)}</span>
            <span>{formatMoney(TP_BUSINESS_FEE)}</span>
            <span>{formatMoney(OFFICE_BUSINESS_FEE)}</span>
          </div>
        </div>
      </section>

      <section className="list-panel panel rise" style={{ marginTop: '1rem' }}>
        <div className="section-head">
          <h2>1. TC — Tax Client</h2>
          <span className="badge badge-ok">Approved</span>
        </div>
        <p className="muted">Direct registration. NOVARA calculates and applies allowable benefits automatically.</p>
        {TC_FEES.map((f) => (
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
          <h2>2. TP — Tax Preparer</h2>
          <span className="badge badge-ok">{UNLIMITED_CLIENTS_COPY}</span>
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
          <h2>3. Office — Tax Office</h2>
          <span className="badge badge-ok">{UNLIMITED_CLIENTS_COPY}</span>
        </div>
        <ul className="check-list">
          {STARTER_INCLUDES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="tier-list">
          {OFFICE_TIERS.map((t) => (
            <div className="row-item" key={t.id}>
              <div>
                <strong>{t.name}</strong>
                <span className="row-meta">{t.blurb}</span>
              </div>
              <strong>{formatMoney(t.annual!)}/yr</strong>
            </div>
          ))}
        </div>
        {OFFICE_FEES.filter((f) => f.id.startsWith('office-p') || f.id.startsWith('office-b')).map((f) => (
          <div className="row-item" key={f.id}>
            <div>
              <strong>{f.label}</strong>
            </div>
            <strong>{formatMoney(f.amount)}</strong>
          </div>
        ))}
      </section>

      <section className="list-panel panel" style={{ marginTop: '1rem' }}>
        <div className="section-head">
          <h2>4. Bank products</h2>
          <span className="badge badge-warn">Not live</span>
        </div>
        <p className="muted" style={{ marginTop: 0 }}>
          {BANKING_FEES_NOTE}
        </p>
      </section>

      <section className="list-panel panel calculator" style={{ marginTop: '1rem' }}>
        <h2>Fee calculator</h2>
        <div className="calc-grid">
          <div className="field">
            <label htmlFor="sched">Fee schedule</label>
            <select id="sched" value={schedule} onChange={(e) => setSchedule(e.target.value as 'Office' | 'TP')}>
              <option value="Office">Office software fees</option>
              <option value="TP">TP software fees</option>
            </select>
          </div>
          {schedule === 'Office' && (
            <div className="field">
              <label htmlFor="sub">Subscription</label>
              <select id="sub" value={subAmount} onChange={(e) => setSubAmount(Number(e.target.value))}>
                <option value={OFFICE_SUBSCRIPTION_FLOOR}>{formatMoney(OFFICE_SUBSCRIPTION_FLOOR)} Standard</option>
                <option value={OFFICE_SUBSCRIPTION_HIGH}>{formatMoney(OFFICE_SUBSCRIPTION_HIGH)} Plus</option>
              </select>
            </div>
          )}
          <div className="field">
            <label htmlFor="ind">Personal returns</label>
            <input
              id="ind"
              type="number"
              min={0}
              value={individualReturns}
              onChange={(e) => setIndividualReturns(Number(e.target.value) || 0)}
            />
          </div>
          <div className="field">
            <label htmlFor="biz">Business returns</label>
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
              <strong>{schedule === 'Office' ? 'Subscription' : 'TP registration (year-one model)'}</strong>
            </div>
            <strong>
              {formatMoney(schedule === 'Office' ? subAmount : TP_REGISTRATION_FEE)}
            </strong>
          </div>
          <div className="row-item">
            <div>
              <strong>Personal return fees</strong>
              <span className="row-meta">
                {individualReturns} × {formatMoney(estimate.personalRate)}
              </span>
            </div>
            <strong>{formatMoney(estimate.individualFees)}</strong>
          </div>
          <div className="row-item">
            <div>
              <strong>Business return fees</strong>
              <span className="row-meta">
                {businessReturns} × {formatMoney(estimate.businessRate)}
              </span>
            </div>
            <strong>{formatMoney(estimate.businessFees)}</strong>
          </div>
          <div className="row-item total-row">
            <div>
              <strong>Estimated NOVARA platform charges</strong>
              <span className="row-meta">Excludes customer prep markups and bank products</span>
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
    </div>
  )
}
